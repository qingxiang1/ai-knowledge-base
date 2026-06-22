from __future__ import annotations

import argparse
import json
from statistics import mean
from typing import Dict, List

from common import ensure_parent, jaccard_similarity, load_json, normalize_text, read_jsonl, write_jsonl


def parse_args():
    parser = argparse.ArgumentParser(
        description="Run a lightweight business evaluation through an OpenAI-compatible API."
    )
    parser.add_argument("--config", required=True, help="Path to JSON config.")
    parser.add_argument("--limit", type=int, default=None, help="Optional maximum number of samples.")
    return parser.parse_args()


def build_messages(system_prompt: str | None, question: str):
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": question})
    return messages


def extract_question_and_answer(row):
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


def find_nearest_training_example(question: str, train_rows, top_k: int = 1):
    scored = []
    for row in train_rows:
        train_question, train_answer = extract_question_and_answer(row)
        if not train_question:
            continue
        scored.append(
            {
                "score": round(jaccard_similarity(question, train_question), 4),
                "question": train_question,
                "answer": train_answer,
            }
        )
    scored.sort(key=lambda item: item["score"], reverse=True)
    return scored[:top_k]


def exact_match(prediction: str, reference: str) -> float:
    return 1.0 if normalize_text(prediction) == normalize_text(reference) else 0.0


def keyword_coverage(prediction: str, keywords: List[str]) -> float:
    if not keywords:
        return 1.0
    hits = sum(1 for keyword in keywords if keyword in prediction)
    return hits / len(keywords)


def main():
    args = parse_args()
    config = load_json(args.config)
    rows = read_jsonl(config["input_file"])
    if args.limit is not None:
        rows = rows[: args.limit]
    train_rows = read_jsonl(config["debug_train_file"]) if config.get("debug_train_file") else []

    from openai import OpenAI

    client = OpenAI(base_url=config["base_url"], api_key=config["api_key"])
    predictions = []
    em_scores: List[float] = []
    keyword_scores: List[float] = []
    lengths: List[int] = []

    for row in rows:
        response = client.chat.completions.create(
            model=config["model"],
            messages=build_messages(config.get("system_prompt"), row["question"]),
            temperature=config.get("temperature", 0.0),
            max_tokens=config.get("max_tokens", 256),
        )
        prediction = response.choices[0].message.content.strip()
        em = exact_match(prediction, row["reference"])
        keyword_score = keyword_coverage(prediction, row.get("required_keywords", []))
        predictions.append(
            {
                "question": row["question"],
                "reference": row["reference"],
                "prediction": prediction,
                "exact_match": em,
                "keyword_coverage": keyword_score,
                "nearest_training_examples": find_nearest_training_example(
                    row["question"],
                    train_rows,
                    top_k=config.get("debug_top_k", 1),
                )
                if train_rows
                else [],
            }
        )
        em_scores.append(em)
        keyword_scores.append(keyword_score)
        lengths.append(len(prediction))

    metrics = {
        "num_samples": len(predictions),
        "avg_exact_match": mean(em_scores) if em_scores else 0.0,
        "avg_keyword_coverage": mean(keyword_scores) if keyword_scores else 0.0,
        "avg_prediction_chars": mean(lengths) if lengths else 0.0,
    }

    write_jsonl(config["predictions_file"], predictions)
    metrics_path = ensure_parent(config["metrics_file"])
    with metrics_path.open("w", encoding="utf-8") as fh:
        json.dump(metrics, fh, ensure_ascii=False, indent=2)

    print(json.dumps(metrics, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
