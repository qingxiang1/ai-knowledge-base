from __future__ import annotations

import argparse

from common import default_hf_cache_dir, ensure_dir, load_json


def parse_args():
    parser = argparse.ArgumentParser(description="Run a tiny decoder-only pretraining experiment.")
    parser.add_argument("--config", required=True, help="Path to JSON config.")
    return parser.parse_args()


def main():
    args = parse_args()
    config = load_json(args.config)

    import torch
    from datasets import load_dataset
    from transformers import (
        AutoTokenizer,
        DataCollatorForLanguageModeling,
        GPT2Config,
        GPT2LMHeadModel,
        Trainer,
        TrainingArguments,
    )

    ensure_dir(config["output_dir"])
    cache_dir = ensure_dir(config.get("cache_dir", default_hf_cache_dir()))

    # Load plain-text corpora for a tiny causal language-modeling experiment.
    dataset = load_dataset(
        "text",
        data_files={
            "train": config["train_file"],
            "validation": config["validation_file"],
        },
        cache_dir=str(cache_dir / "datasets"),
    )

    # The tokenizer must already exist; it is produced by train_tokenizer.py.
    tokenizer = AutoTokenizer.from_pretrained(
        config["tokenizer_dir"],
        use_fast=True,
        cache_dir=str(cache_dir / "transformers"),
    )
    if tokenizer.pad_token is None:
        # GPT-style tokenizers often lack an explicit pad token.
        tokenizer.pad_token = tokenizer.eos_token

    block_size = config.get("block_size", 128)

    def tokenize_fn(batch):
        # Convert raw text strings into token ids.
        return tokenizer(batch["text"])

    tokenized = dataset.map(tokenize_fn, batched=True, remove_columns=["text"])

    def group_texts(examples):
        # Concatenate tokenized examples, then cut them into fixed-size blocks.
        concatenated = {k: sum(examples[k], []) for k in examples.keys()}
        total_length = len(concatenated["input_ids"])
        # Drop the remainder so every sample has exactly block_size tokens.
        total_length = (total_length // block_size) * block_size
        result = {
            k: [t[i : i + block_size] for i in range(0, total_length, block_size)]
            for k, t in concatenated.items()
        }
        # For causal LM, labels mirror input_ids; the model learns next-token prediction.
        result["labels"] = result["input_ids"].copy()
        return result

    lm_dataset = tokenized.map(group_texts, batched=True)

    # Build a deliberately tiny GPT-style model so the full flow can run locally.
    model_config = GPT2Config(
        vocab_size=tokenizer.vocab_size,
        n_positions=block_size,
        n_ctx=block_size,
        n_embd=config.get("hidden_size", 256),
        n_layer=config.get("num_hidden_layers", 4),
        n_head=config.get("num_attention_heads", 4),
        n_inner=config.get("intermediate_size", 1024),
        bos_token_id=tokenizer.bos_token_id,
        eos_token_id=tokenizer.eos_token_id,
    )

    model = GPT2LMHeadModel(model_config)

    # TrainingArguments keeps the training loop declarative and config-driven.
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
        eval_steps=config["eval_steps"],
        eval_strategy="steps",
        save_total_limit=config.get("save_total_limit", 2),
        bf16=config.get("bf16", False),
        fp16=config.get("fp16", False),
        report_to="none",
        remove_unused_columns=False,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=lm_dataset["train"],
        eval_dataset=lm_dataset["validation"],
        data_collator=DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False),
    )

    trainer.train()
    # Save both model and tokenizer so the output dir can be loaded directly later.
    trainer.save_model(config["output_dir"])
    tokenizer.save_pretrained(config["output_dir"])

    if torch.cuda.is_available():
        print("CUDA is available. Training finished on GPU.")
    else:
        print("CUDA is not available. Training finished on CPU.")


if __name__ == "__main__":
    main()
