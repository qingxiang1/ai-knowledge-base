from __future__ import annotations

import argparse

from common import default_hf_cache_dir, ensure_dir, load_json
from training_utils import format_message


def parse_args():
    parser = argparse.ArgumentParser(description="Run an interactive local chat REPL.")
    parser.add_argument("--config", required=True, help="Path to JSON config.")
    return parser.parse_args()


def trim_history(messages, tokenizer, max_positions: int) -> str:
    kept = []
    for message in reversed(messages):
        kept.insert(0, message)
        prompt = "\n".join(format_message(m["role"], m["content"]) for m in kept) + "\n助手："
        token_count = len(tokenizer(prompt, add_special_tokens=False)["input_ids"])
        if token_count >= max_positions - 16:
            kept.pop(0)
            break
    return "\n".join(format_message(m["role"], m["content"]) for m in kept) + "\n助手："


def main():
    args = parse_args()
    config = load_json(args.config)
    cache_dir = ensure_dir(config.get("cache_dir", default_hf_cache_dir()))

    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(
        config["model_name_or_path"],
        use_fast=True,
        cache_dir=str(cache_dir / "transformers"),
    )
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        config["model_name_or_path"],
        torch_dtype=torch.float32,
        cache_dir=str(cache_dir / "transformers"),
    )
    model.eval()
    max_positions = (
        getattr(model.config, "n_positions", None)
        or getattr(model.config, "max_position_embeddings", None)
        or 512
    )

    messages = []
    if config.get("system_prompt"):
        messages.append({"role": "system", "content": config["system_prompt"]})

    print("Entering local chat REPL. Type /exit to quit, /clear to reset history.")
    while True:
        try:
            user_text = input("user> ").strip()
        except EOFError:
            break

        if not user_text:
            continue
        if user_text == "/exit":
            break
        if user_text == "/clear":
            messages = []
            if config.get("system_prompt"):
                messages.append({"role": "system", "content": config["system_prompt"]})
            print("history cleared")
            continue

        messages.append({"role": "user", "content": user_text})
        prompt_text = trim_history(messages, tokenizer, max_positions)
        inputs = tokenizer(
            prompt_text,
            return_tensors="pt",
            truncation=True,
            max_length=max_positions - 1,
        )

        available_new_tokens = max(1, max_positions - inputs["input_ids"].shape[1])
        max_new_tokens = min(config.get("max_new_tokens", 48), available_new_tokens)
        min_new_tokens = min(config.get("min_new_tokens", 1), max_new_tokens)

        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                min_new_tokens=min_new_tokens,
                temperature=config.get("temperature", 0.8),
                top_p=config.get("top_p", 0.95),
                do_sample=config.get("do_sample", True),
                repetition_penalty=config.get("repetition_penalty", 1.05),
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id,
            )

        generated_ids = outputs[0][inputs["input_ids"].shape[1] :]
        reply = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()
        if not reply:
            reply = "[empty generation]"
        print(f"assistant> {reply}")
        messages.append({"role": "assistant", "content": reply})


if __name__ == "__main__":
    main()
