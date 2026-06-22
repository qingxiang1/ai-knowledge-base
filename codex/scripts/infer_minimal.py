from __future__ import annotations

import argparse
import json

from common import default_hf_cache_dir, ensure_dir, load_json
from common import jaccard_similarity, read_jsonl
from training_utils import build_text_from_messages


def parse_args():
    parser = argparse.ArgumentParser(description="Run minimal local inference on a causal LM.")
    parser.add_argument("--config", required=True, help="Path to JSON config.")
    parser.add_argument("--prompt", help="Override the user prompt in config.")
    parser.add_argument(
        "--show-similar",
        action="store_true",
        help="Show similar training examples before generation.",
    )
    return parser.parse_args()


def extract_question_and_answer(row):
    # Support both chat-style rows and simple question/answer rows.
    messages = row.get("messages")
    if messages:
        user_text = ""
        assistant_text = ""
        for message in messages:
            role = message.get("role")
            if role == "user" and not user_text:
                user_text = message.get("content", "")
            if role == "assistant" and not assistant_text:
                assistant_text = message.get("content", "")
        return user_text, assistant_text
    return row.get("question", ""), row.get("answer", "")


def print_similar_examples(query: str, train_file: str, top_k: int = 3) -> None:
    # Show nearest training examples before generation to help spot memorization.
    rows = read_jsonl(train_file)
    scored = []
    for row in rows:
        question, answer = extract_question_and_answer(row)
        if not question:
            continue
        scored.append(
            {
                # Lightweight lexical similarity is enough for a CPU debug signal.
                "score": round(jaccard_similarity(query, question), 4),
                "question": question,
                "answer": answer,
            }
        )
    scored.sort(key=lambda item: item["score"], reverse=True)
    print("=== Similar Training Examples ===")
    print(json.dumps(scored[:top_k], ensure_ascii=False, indent=2))
    print()


def main():
    args = parse_args()
    config = load_json(args.config)
    cache_dir = ensure_dir(config.get("cache_dir", default_hf_cache_dir()))

    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    # Load the tokenizer and model from the SFT output directory.
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
    # eval() disables training-time behavior such as dropout.
    model.eval()
    max_positions = (
        getattr(model.config, "n_positions", None)
        or getattr(model.config, "max_position_embeddings", None)
        or 512
    )

    user_prompt = args.prompt or config["user_prompt"]
    if args.show_similar and config.get("debug_train_file"):
        print_similar_examples(user_prompt, config["debug_train_file"], config.get("debug_top_k", 3))

    # Build the same role-based prompt shape used during SFT.
    messages = []
    if config.get("system_prompt"):
        messages.append({"role": "system", "content": config["system_prompt"]})
    messages.append({"role": "user", "content": user_prompt})

    prompt_text = build_text_from_messages(tokenizer, messages)
    inputs = tokenizer(
        prompt_text,
        return_tensors="pt",
        truncation=True,
        max_length=max_positions - 1,
    )
    # Avoid requesting more generated tokens than the model context window allows.
    available_new_tokens = max(1, max_positions - inputs["input_ids"].shape[1])
    requested_new_tokens = config.get("max_new_tokens", 64)
    max_new_tokens = min(requested_new_tokens, available_new_tokens)
    min_new_tokens = min(config.get("min_new_tokens", 1), max_new_tokens)

    # Inference does not need gradients, so no_grad saves memory and compute.
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            min_new_tokens=min_new_tokens,
            temperature=config.get("temperature", 1.0),
            top_p=config.get("top_p", 1.0),
            do_sample=config.get("do_sample", False),
            repetition_penalty=config.get("repetition_penalty", 1.0),
            pad_token_id=tokenizer.pad_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )

    # Decode only newly generated tokens, not the prompt tokens.
    generated_ids = outputs[0][inputs["input_ids"].shape[1] :]
    generated_text = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()

    print("=== Prompt ===")
    print(user_prompt)
    print()
    print("=== Response ===")
    print(generated_text if generated_text else "[empty generation]")


if __name__ == "__main__":
    main()
