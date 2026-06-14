from __future__ import annotations

import argparse

from common import default_hf_cache_dir, ensure_dir, load_json
from training_utils import resolve_dtype


def parse_args():
    parser = argparse.ArgumentParser(description="Merge a LoRA adapter into the base model.")
    parser.add_argument("--config", required=True, help="Path to JSON config.")
    return parser.parse_args()


def main():
    args = parse_args()
    config = load_json(args.config)
    ensure_dir(config["output_dir"])
    cache_dir = ensure_dir(config.get("cache_dir", default_hf_cache_dir()))

    from peft import PeftModel
    from transformers import AutoModelForCausalLM, AutoTokenizer

    dtype = resolve_dtype(config.get("torch_dtype", "bfloat16"))

    tokenizer = AutoTokenizer.from_pretrained(
        config["base_model"],
        use_fast=True,
        cache_dir=str(cache_dir / "transformers"),
    )
    model = AutoModelForCausalLM.from_pretrained(
        config["base_model"],
        torch_dtype=dtype,
        device_map="auto",
        cache_dir=str(cache_dir / "transformers"),
    )
    model = PeftModel.from_pretrained(model, config["adapter_path"])
    merged = model.merge_and_unload()

    merged.save_pretrained(config["output_dir"], safe_serialization=True)
    tokenizer.save_pretrained(config["output_dir"])
    print(f"Merged model saved to {config['output_dir']}")


if __name__ == "__main__":
    main()
