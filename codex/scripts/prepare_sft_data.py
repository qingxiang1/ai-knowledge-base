from __future__ import annotations

import argparse
import json
from collections import Counter

from common import ensure_parent, load_json, normalize_text, read_jsonl, write_jsonl


def parse_args():
    parser = argparse.ArgumentParser(
        description="Prepare raw customer-support style data into chat-format SFT JSONL."
    )
    parser.add_argument("--config", required=True, help="Path to JSON config.")
    return parser.parse_args()


def build_messages(system_prompt: str, question: str, answer: str):
    # Convert a raw QA row into the chat-style format used by SFT.
    return {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
            {"role": "assistant", "content": answer},
        ]
    }


def main():
    args = parse_args()
    config = load_json(args.config)
    rows = read_jsonl(config["input_file"])

    # Keep accepted and rejected rows separately so data quality issues are auditable.
    seen = set()
    accepted = []
    rejected = []
    stats = Counter()

    for row in rows:
        # Normalize whitespace before filtering and deduplication.
        question = " ".join(str(row.get("question", "")).split())
        answer = " ".join(str(row.get("answer", "")).split())
        system_prompt = row.get("instruction") or config["default_system_prompt"]
        quality = row.get("quality", "unknown")

        # Drop rows whose quality label is not allowed by the current experiment.
        if quality not in config["allowed_quality"]:
            rejected.append({"reason": "quality_filter", "row": row})
            stats["rejected_quality"] += 1
            continue

        # Very short questions usually do not carry enough training signal.
        if len(question) < config["min_question_chars"]:
            rejected.append({"reason": "question_too_short", "row": row})
            stats["rejected_short_question"] += 1
            continue

        # Very short answers are often incomplete or not useful for SFT.
        if len(answer) < config["min_answer_chars"]:
            rejected.append({"reason": "answer_too_short", "row": row})
            stats["rejected_short_answer"] += 1
            continue

        # Deduplicate on the full training triple, not only the user question.
        dedup_key = (
            normalize_text(system_prompt),
            normalize_text(question),
            normalize_text(answer),
        )
        if dedup_key in seen:
            rejected.append({"reason": "duplicate", "row": row})
            stats["rejected_duplicate"] += 1
            continue
        seen.add(dedup_key)

        accepted.append(build_messages(system_prompt, question, answer))
        stats["accepted"] += 1

    # Persist both usable samples and rejected rows for later inspection.
    write_jsonl(config["output_file"], accepted)
    write_jsonl(config["rejected_file"], rejected)

    # A compact summary makes data preparation easy to verify in CI or tutorials.
    summary = {
        "input_rows": len(rows),
        "accepted_rows": len(accepted),
        "rejected_rows": len(rejected),
        "stats": dict(stats),
        "output_file": config["output_file"],
        "rejected_file": config["rejected_file"],
    }
    summary_path = ensure_parent("outputs/data_prep/prepare_sft_summary.json")
    with summary_path.open("w", encoding="utf-8") as fh:
        json.dump(summary, fh, ensure_ascii=False, indent=2)

    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
