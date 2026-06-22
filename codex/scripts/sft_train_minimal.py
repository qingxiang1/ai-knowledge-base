from __future__ import annotations

import argparse

from common import default_hf_cache_dir, ensure_dir, load_json
from training_utils import build_supervised_chat_texts, load_chat_examples, maybe_split_dataset


def parse_args():
    parser = argparse.ArgumentParser(
        description="Run a minimal CPU-friendly SFT pipeline without TRL."
    )
    parser.add_argument("--config", required=True, help="Path to JSON config.")
    return parser.parse_args()


def main():
    args = parse_args()
    config = load_json(args.config)
    ensure_dir(config["output_dir"])
    cache_dir = ensure_dir(config.get("cache_dir", default_hf_cache_dir()))

    import torch
    from transformers import (
        AutoModelForCausalLM,
        AutoTokenizer,
        Trainer,
        TrainingArguments,
    )

    # Load chat-style SFT examples from JSONL.
    rows = load_chat_examples(config["train_file"])

    # Start from the tiny pretrained checkpoint produced in the previous stage.
    tokenizer = AutoTokenizer.from_pretrained(
        config["model_name_or_path"],
        use_fast=True,
        cache_dir=str(cache_dir / "transformers"),
    )
    if tokenizer.pad_token is None:
        # Padding is required for batching variable-length examples.
        tokenizer.pad_token = tokenizer.eos_token

    from datasets import Dataset

    # Split each chat example into prompt-only text and full supervised text.
    structured_rows = []
    for row in rows:
        prompt_text, full_text = build_supervised_chat_texts(row, config.get("system_prompt"))
        structured_rows.append({"prompt_text": prompt_text, "full_text": full_text})

    prepared = Dataset.from_list(structured_rows)
    # A validation split is optional for the tiny CPU debug path.
    train_dataset, eval_dataset = maybe_split_dataset(prepared, config.get("validation_split_ratio", 0.0))

    max_seq_length = config["max_seq_length"]

    def tokenize_function(batch):
        all_input_ids = []
        all_attention_masks = []
        all_labels = []
        eos_id = tokenizer.eos_token_id

        for prompt_text, full_text in zip(batch["prompt_text"], batch["full_text"]):
            # prompt_ids mark the conditioning part: system + user + "assistant:".
            prompt_ids = tokenizer(
                prompt_text,
                truncation=True,
                max_length=max_seq_length,
                add_special_tokens=False,
            )["input_ids"]
            # full_ids include both prompt and target assistant answer.
            full_ids = tokenizer(
                full_text,
                truncation=True,
                max_length=max_seq_length - 1,
                add_special_tokens=False,
            )["input_ids"] + [eos_id]
            full_ids = full_ids[:max_seq_length]
            attention_mask = [1] * len(full_ids)

            # Start with labels equal to inputs, then mask the prompt tokens.
            labels = full_ids.copy()
            prompt_length = min(len(prompt_ids), len(labels))
            for idx in range(prompt_length):
                # -100 tells Transformers loss functions to ignore this token.
                labels[idx] = -100

            all_input_ids.append(full_ids)
            all_attention_masks.append(attention_mask)
            all_labels.append(labels)

        return {
            "input_ids": all_input_ids,
            "attention_mask": all_attention_masks,
            "labels": all_labels,
        }

    train_dataset = train_dataset.map(tokenize_function, batched=True, remove_columns=["prompt_text", "full_text"])
    if eval_dataset is not None:
        eval_dataset = eval_dataset.map(
            tokenize_function,
            batched=True,
            remove_columns=["prompt_text", "full_text"],
        )

    # Load the model in float32 to keep this script CPU-friendly and dependency-light.
    model = AutoModelForCausalLM.from_pretrained(
        config["model_name_or_path"],
        torch_dtype=torch.float32,
        cache_dir=str(cache_dir / "transformers"),
    )
    model.config.use_cache = False
    if config.get("gradient_checkpointing", False):
        model.gradient_checkpointing_enable()

    training_args = TrainingArguments(
        output_dir=config["output_dir"],
        per_device_train_batch_size=config["per_device_train_batch_size"],
        per_device_eval_batch_size=config.get(
            "per_device_eval_batch_size", config["per_device_train_batch_size"]
        ),
        gradient_accumulation_steps=config["gradient_accumulation_steps"],
        learning_rate=config["learning_rate"],
        num_train_epochs=config["num_train_epochs"],
        logging_steps=config["logging_steps"],
        save_steps=config["save_steps"],
        eval_steps=config.get("eval_steps", config["save_steps"]),
        eval_strategy="steps" if eval_dataset is not None else "no",
        save_total_limit=config.get("save_total_limit", 2),
        bf16=config.get("bf16", False),
        fp16=config.get("fp16", False),
        report_to="none",
        remove_unused_columns=False,
    )

    class SupervisedDataCollator:
        def __init__(self, pad_token_id: int):
            self.pad_token_id = pad_token_id

        def __call__(self, features):
            import torch

            # Pad every sample in the batch to the longest sequence in that batch.
            max_length = max(len(feature["input_ids"]) for feature in features)
            batch = {"input_ids": [], "attention_mask": [], "labels": []}
            for feature in features:
                pad_length = max_length - len(feature["input_ids"])
                # input_ids use pad_token_id; attention_mask and labels use special masks.
                batch["input_ids"].append(feature["input_ids"] + [self.pad_token_id] * pad_length)
                batch["attention_mask"].append(feature["attention_mask"] + [0] * pad_length)
                batch["labels"].append(feature["labels"] + [-100] * pad_length)
            return {
                key: torch.tensor(value, dtype=torch.long)
                for key, value in batch.items()
            }

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        data_collator=SupervisedDataCollator(tokenizer.pad_token_id),
    )

    trainer.train()
    # Save a self-contained model directory for later local inference.
    trainer.save_model(config["output_dir"])
    tokenizer.save_pretrained(config["output_dir"])
    print(f"Minimal SFT finished. Artifacts saved to {config['output_dir']}")


if __name__ == "__main__":
    main()
