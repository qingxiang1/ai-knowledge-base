from __future__ import annotations

import argparse
import json

from common import ensure_dir, iter_text_lines, load_json


def parse_args():
    parser = argparse.ArgumentParser(description="Train a BPE tokenizer and export HF format.")
    parser.add_argument("--config", required=True, help="Path to JSON config.")
    return parser.parse_args()


def main():
    args = parse_args()
    config = load_json(args.config)

    from tokenizers import Tokenizer
    from tokenizers.models import BPE
    from tokenizers.pre_tokenizers import Whitespace
    from tokenizers.trainers import BpeTrainer
    from transformers import PreTrainedTokenizerFast

    output_dir = ensure_dir(config["output_dir"])
    files = config["files"]

    # Use a small BPE tokenizer for teaching; real projects may reuse a base model tokenizer.
    tokenizer = Tokenizer(BPE(unk_token="[UNK]"))
    # Whitespace pre-tokenization keeps the example simple and easy to inspect.
    tokenizer.pre_tokenizer = Whitespace()
    trainer = BpeTrainer(
        vocab_size=config.get("vocab_size", 16000),
        min_frequency=config.get("min_frequency", 2),
        special_tokens=config.get("special_tokens", ["[PAD]", "[UNK]", "[BOS]", "[EOS]"]),
    )
    # Stream corpus lines instead of loading a large corpus into one giant string.
    tokenizer.train_from_iterator(iter_text_lines(files), trainer=trainer)

    # Save the native tokenizers artifact first.
    tokenizer_json = output_dir / "tokenizer.json"
    tokenizer.save(str(tokenizer_json))

    # Export in Hugging Face format so AutoTokenizer can load it in later stages.
    hf_tokenizer = PreTrainedTokenizerFast(
        tokenizer_file=str(tokenizer_json),
        unk_token="[UNK]",
        pad_token="[PAD]",
        bos_token="[BOS]",
        eos_token="[EOS]",
    )
    hf_tokenizer.save_pretrained(output_dir)

    # Metadata is useful when comparing tokenizer experiments.
    metadata = {
        "files": files,
        "vocab_size": hf_tokenizer.vocab_size,
        "special_tokens": config.get("special_tokens", ["[PAD]", "[UNK]", "[BOS]", "[EOS]"]),
    }
    with (output_dir / "tokenizer_training_meta.json").open("w", encoding="utf-8") as fh:
        json.dump(metadata, fh, ensure_ascii=False, indent=2)

    print(f"Tokenizer saved to {output_dir}")


if __name__ == "__main__":
    main()
