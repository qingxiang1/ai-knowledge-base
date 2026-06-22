from __future__ import annotations

from typing import Any, Dict, List, Tuple

from common import default_hf_cache_dir, ensure_dir, read_jsonl


def resolve_dtype(dtype_name: str):
    import torch

    # Accept common aliases so configs can use either short or explicit names.
    mapping = {
        "float16": torch.float16,
        "fp16": torch.float16,
        "bfloat16": torch.bfloat16,
        "bf16": torch.bfloat16,
        "float32": torch.float32,
        "fp32": torch.float32,
    }
    if dtype_name not in mapping:
        raise ValueError(f"Unsupported dtype: {dtype_name}")
    return mapping[dtype_name]


def build_text_from_messages(tokenizer, messages: List[Dict[str, str]]) -> str:
    # Prefer the tokenizer's native chat template when a real chat model provides one.
    if hasattr(tokenizer, "apply_chat_template") and tokenizer.chat_template:
        return tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=False,
        )

    # Fallback format for tiny teaching models that do not define a chat template.
    role_map = {
        "system": "系统",
        "user": "用户",
        "assistant": "助手",
    }
    parts: List[str] = []
    for message in messages:
        role = message.get("role", "user")
        content = message.get("content", "")
        role_name = role_map.get(role, role)
        parts.append(f"{role_name}：{content}")

    if not messages or messages[-1].get("role") != "assistant":
        # Add an assistant prefix so generation starts in the assistant role.
        parts.append("助手：")

    return "\n".join(parts)


def format_message(role: str, content: str) -> str:
    role_map = {
        "system": "系统",
        "user": "用户",
        "assistant": "助手",
    }
    role_name = role_map.get(role, role)
    return f"{role_name}：{content}"


def build_supervised_chat_texts(
    row: Dict[str, Any],
    default_system_prompt: str | None = None,
) -> Tuple[str, str]:
    # Return two strings:
    # prompt_text = conditioning text only; full_text = prompt + assistant answer.
    messages = row.get("messages")
    if messages:
        assistant_index = None
        # Train on the last assistant response so multi-turn rows remain possible.
        for idx in range(len(messages) - 1, -1, -1):
            if messages[idx].get("role") == "assistant":
                assistant_index = idx
                break
        if assistant_index is None:
            raise ValueError("messages row must contain at least one assistant message.")

        prefix_parts: List[str] = []
        for message in messages[:assistant_index]:
            prefix_parts.append(format_message(message.get("role", "user"), message.get("content", "")))
        prefix_parts.append("助手：")
        prompt_text = "\n".join(prefix_parts)

        # The assistant content is the supervised target appended after the prompt.
        assistant_content = messages[assistant_index].get("content", "")
        full_text = prompt_text + assistant_content
        return prompt_text, full_text

    # Also support flat question/answer rows for small handcrafted datasets.
    question = row.get("question")
    answer = row.get("answer")
    if question and answer:
        prefix_parts: List[str] = []
        system_prompt = row.get("system_prompt") or default_system_prompt
        if system_prompt:
            prefix_parts.append(format_message("system", system_prompt))
        prefix_parts.append(format_message("user", question))
        prefix_parts.append("助手：")
        prompt_text = "\n".join(prefix_parts)
        full_text = prompt_text + answer
        return prompt_text, full_text

    raise ValueError("Each row must contain either messages or question+answer for supervised training.")


def load_chat_examples(path: str) -> List[Dict[str, Any]]:
    rows = read_jsonl(path)
    if not rows:
        raise ValueError(f"No rows found in {path}")
    return rows


def maybe_split_dataset(dataset, validation_split_ratio: float):
    # Keep evaluation optional for tiny smoke/debug runs.
    if validation_split_ratio <= 0:
        return dataset, None
    split = dataset.train_test_split(test_size=validation_split_ratio, seed=42)
    return split["train"], split["test"]


def load_quantization_config(load_in_4bit: bool):
    # QLoRA uses 4bit quantization; CPU/debug paths skip this entirely.
    if not load_in_4bit:
        return None

    import torch
    from transformers import BitsAndBytesConfig

    return BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_use_double_quant=True,
    )


def create_lora_config(config: Dict[str, Any]):
    from peft import LoraConfig

    # LoRA trains small adapter matrices instead of updating every model weight.
    return LoraConfig(
        r=config["lora_r"],
        lora_alpha=config["lora_alpha"],
        lora_dropout=config["lora_dropout"],
        target_modules=config["target_modules"],
        task_type="CAUSAL_LM",
    )


def prepare_text_dataset(dataset, tokenizer, default_system_prompt: str | None = None):
    from datasets import Dataset

    def format_row(row: Dict[str, Any]) -> Dict[str, str]:
        # TRL SFTTrainer expects a single text field by default.
        if "text" in row and row["text"]:
            return {"text": row["text"]}

        messages = row.get("messages")
        if messages:
            return {"text": build_text_from_messages(tokenizer, messages)}

        question = row.get("question")
        answer = row.get("answer")
        if question and answer:
            system_prompt = row.get("system_prompt") or default_system_prompt
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.extend(
                [
                    {"role": "user", "content": question},
                    {"role": "assistant", "content": answer},
                ]
            )
            return {"text": build_text_from_messages(tokenizer, messages)}

        raise ValueError("Each row must contain either text, messages, or question+answer.")

    return Dataset.from_list([format_row(row) for row in dataset])


def prepare_model_and_tokenizer(config: Dict[str, Any]):
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    cache_dir = ensure_dir(config.get("cache_dir", default_hf_cache_dir()))

    # Load tokenizer first so padding and chat formatting are available downstream.
    tokenizer = AutoTokenizer.from_pretrained(
        config["model_name_or_path"],
        use_fast=True,
        cache_dir=str(cache_dir / "transformers"),
    )
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    quantization_config = load_quantization_config(config.get("load_in_4bit", False))
    # 4bit models need device_map="auto"; CPU/full precision debug runs do not.
    model = AutoModelForCausalLM.from_pretrained(
        config["model_name_or_path"],
        torch_dtype=torch.bfloat16 if torch.cuda.is_available() else torch.float32,
        quantization_config=quantization_config,
        device_map="auto" if config.get("load_in_4bit", False) else None,
        cache_dir=str(cache_dir / "transformers"),
    )

    if config.get("gradient_checkpointing", True):
        # Saves memory during training at the cost of extra compute.
        model.gradient_checkpointing_enable()
        model.config.use_cache = False

    return model, tokenizer


def create_sft_trainer(config: Dict[str, Any], raw_rows: List[Dict[str, Any]]):
    from trl import SFTConfig, SFTTrainer

    model, tokenizer = prepare_model_and_tokenizer(config)
    # Convert raw rows into the single text field consumed by SFTTrainer.
    prepared = prepare_text_dataset(raw_rows, tokenizer, config.get("system_prompt"))
    train_dataset, eval_dataset = maybe_split_dataset(
        prepared, config.get("validation_split_ratio", 0.0)
    )

    training_args = SFTConfig(
        output_dir=config["output_dir"],
        max_seq_length=config["max_seq_length"],
        per_device_train_batch_size=config["per_device_train_batch_size"],
        per_device_eval_batch_size=config.get(
            "per_device_eval_batch_size", config["per_device_train_batch_size"]
        ),
        gradient_accumulation_steps=config["gradient_accumulation_steps"],
        learning_rate=config["learning_rate"],
        num_train_epochs=config["num_train_epochs"],
        logging_steps=config["logging_steps"],
        save_steps=config["save_steps"],
        eval_steps=config.get("eval_steps"),
        eval_strategy="steps" if eval_dataset is not None else "no",
        bf16=config.get("bf16", True),
        report_to="none",
        dataset_text_field="text",
        save_total_limit=config.get("save_total_limit", 2),
    )

    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        processing_class=tokenizer,
        peft_config=create_lora_config(config),
    )
    return trainer, tokenizer
