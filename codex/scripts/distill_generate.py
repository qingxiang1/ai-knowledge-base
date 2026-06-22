from __future__ import annotations

import argparse
import time
from typing import Dict, List

from common import ensure_parent, load_json, read_jsonl, write_jsonl


def parse_args():
    parser = argparse.ArgumentParser(description="Generate distillation data from a teacher model.")
    parser.add_argument("--config", required=True, help="Path to JSON config.")
    parser.add_argument("--limit", type=int, default=None, help="Optional maximum number of rows.")
    return parser.parse_args()


def build_messages(system_prompt: str | None, question: str):
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": question})
    return messages


def main():
    args = parse_args()
    config = load_json(args.config)
    rows = read_jsonl(config["input_file"])
    if args.limit is not None:
        rows = rows[: args.limit]

    from openai import OpenAI

    client = OpenAI(base_url=config["base_url"], api_key=config["api_key"])
    output_rows: List[Dict[str, str]] = []

    output_path = ensure_parent(config["output_file"])

    for index, row in enumerate(rows, start=1):
        question = row["question"]
        response = client.chat.completions.create(
            model=config["model"],
            messages=build_messages(config.get("system_prompt"), question),
            temperature=config.get("temperature", 0.2),
            max_tokens=config.get("max_tokens", 256),
        )
        answer = response.choices[0].message.content.strip()
        output_rows.append(
            {
                "question": question,
                "answer": answer,
                "system_prompt": config.get("system_prompt", ""),
                "teacher_model": config["model"],
            }
        )
        print(f"[{index}/{len(rows)}] generated")
        time.sleep(config.get("sleep_seconds", 0))

    write_jsonl(output_path, output_rows)
    print(f"Generated distillation data saved to {output_path}")


if __name__ == "__main__":
    main()
