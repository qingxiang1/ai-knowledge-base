from __future__ import annotations

import argparse

from common import ensure_dir, load_json
from training_utils import create_sft_trainer, load_chat_examples


def parse_args():
    parser = argparse.ArgumentParser(description="Run LoRA / QLoRA supervised fine-tuning.")
    parser.add_argument("--config", required=True, help="Path to JSON config.")
    return parser.parse_args()


def main():
    args = parse_args()
    config = load_json(args.config)
    ensure_dir(config["output_dir"])

    rows = load_chat_examples(config["train_file"])
    trainer, tokenizer = create_sft_trainer(config, rows)

    trainer.train()
    trainer.save_model(config["output_dir"])
    tokenizer.save_pretrained(config["output_dir"])
    print(f"SFT finished. Artifacts saved to {config['output_dir']}")


if __name__ == "__main__":
    main()
