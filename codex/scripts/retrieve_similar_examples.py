from __future__ import annotations

import argparse
import json

from common import jaccard_similarity, load_json, read_jsonl


def parse_args():
    parser = argparse.ArgumentParser(
        description="Retrieve the most similar training examples for a given question."
    )
    parser.add_argument("--config", required=True, help="Path to JSON config.")
    parser.add_argument("--query", required=True, help="User query to compare against training data.")
    parser.add_argument("--top-k", type=int, default=3, help="Number of similar examples to show.")
    return parser.parse_args()


def extract_question_and_answer(row):
    # Accept both chat-message rows and flat question/answer rows.
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


def main():
    args = parse_args()
    config = load_json(args.config)
    rows = read_jsonl(config["train_file"])

    # Score every training example against the query, then keep the nearest ones.
    scored = []
    for row in rows:
        question, answer = extract_question_and_answer(row)
        if not question:
            continue
        scored.append(
            {
                # Character n-gram Jaccard is simple, fast, and CPU-only.
                "score": round(jaccard_similarity(args.query, question, n=config.get("ngram_size", 2)), 4),
                "question": question,
                "answer": answer,
            }
        )

    # Higher score means more lexical overlap with the user query.
    scored.sort(key=lambda item: item["score"], reverse=True)
    result = {
        "query": args.query,
        "train_file": config["train_file"],
        "top_k": args.top_k,
        "matches": scored[: args.top_k],
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
