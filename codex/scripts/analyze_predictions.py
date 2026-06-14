from __future__ import annotations

import argparse
import json

from common import read_jsonl


def parse_args():
    parser = argparse.ArgumentParser(
        description="Summarize evaluation predictions with nearest training examples."
    )
    parser.add_argument("--predictions", required=True, help="Path to predictions JSONL.")
    parser.add_argument("--top-k", type=int, default=5, help="Number of rows to print.")
    return parser.parse_args()


def main():
    args = parse_args()
    rows = read_jsonl(args.predictions)

    print(f"Loaded {len(rows)} prediction rows from {args.predictions}")
    for index, row in enumerate(rows[: args.top_k], start=1):
        print()
        print(f"=== Sample {index} ===")
        print("Question:", row.get("question", ""))
        print("Reference:", row.get("reference", ""))
        print("Prediction:", row.get("prediction", ""))
        print("Exact Match:", row.get("exact_match", ""))
        print("Keyword Coverage:", row.get("keyword_coverage", ""))
        nearest = row.get("nearest_training_examples", [])
        if nearest:
            print("Nearest Training Example:")
            print(json.dumps(nearest[0], ensure_ascii=False, indent=2))
        else:
            print("Nearest Training Example: []")


if __name__ == "__main__":
    main()
