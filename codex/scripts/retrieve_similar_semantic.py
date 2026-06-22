from __future__ import annotations

import argparse
import json
import math

from common import jaccard_similarity, load_json, read_jsonl


def parse_args():
    parser = argparse.ArgumentParser(
        description="Retrieve similar training examples with lexical or embedding similarity."
    )
    parser.add_argument("--config", required=True, help="Path to JSON config.")
    parser.add_argument("--query", required=True, help="User query to compare against training data.")
    parser.add_argument("--top-k", type=int, default=3, help="Number of similar examples to show.")
    parser.add_argument(
        "--method",
        choices=["auto", "embedding", "lexical"],
        default="auto",
        help="Similarity method. 'auto' prefers embedding and falls back to lexical.",
    )
    return parser.parse_args()


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


def lexical_scores(query: str, rows, ngram_size: int):
    scored = []
    for row in rows:
        question, answer = extract_question_and_answer(row)
        if not question:
            continue
        scored.append(
            {
                "score": round(jaccard_similarity(query, question, n=ngram_size), 4),
                "question": question,
                "answer": answer,
                "method": "lexical",
            }
        )
    scored.sort(key=lambda item: item["score"], reverse=True)
    return scored


def mean_pool(last_hidden_state, attention_mask):
    import torch

    mask = attention_mask.unsqueeze(-1).expand(last_hidden_state.size()).float()
    summed = (last_hidden_state * mask).sum(dim=1)
    counts = mask.sum(dim=1).clamp(min=1e-9)
    return summed / counts


def l2_normalize(embeddings):
    import torch

    return torch.nn.functional.normalize(embeddings, p=2, dim=1)


def embedding_scores(query: str, rows, config):
    import torch
    from transformers import AutoModel, AutoTokenizer

    cache_dir = config.get("cache_dir")
    tokenizer = AutoTokenizer.from_pretrained(
        config["embedding_model_name_or_path"],
        use_fast=True,
        cache_dir=cache_dir,
    )
    model = AutoModel.from_pretrained(
        config["embedding_model_name_or_path"],
        cache_dir=cache_dir,
    )
    model.eval()

    instruction_prefix = config.get("instruction_prefix", "")
    document_prefix = config.get("document_prefix", "")

    questions = []
    answers = []
    for row in rows:
        question, answer = extract_question_and_answer(row)
        if question:
            questions.append(question)
            answers.append(answer)

    if not questions:
        return []

    with torch.no_grad():
        query_inputs = tokenizer(
            [instruction_prefix + query],
            padding=True,
            truncation=True,
            return_tensors="pt",
        )
        query_outputs = model(**query_inputs)
        query_emb = mean_pool(query_outputs.last_hidden_state, query_inputs["attention_mask"])
        query_emb = l2_normalize(query_emb)

        doc_inputs = tokenizer(
            [document_prefix + question for question in questions],
            padding=True,
            truncation=True,
            return_tensors="pt",
        )
        doc_outputs = model(**doc_inputs)
        doc_embs = mean_pool(doc_outputs.last_hidden_state, doc_inputs["attention_mask"])
        doc_embs = l2_normalize(doc_embs)

        sims = torch.matmul(query_emb, doc_embs.T).squeeze(0).tolist()

    scored = []
    for question, answer, score in zip(questions, answers, sims):
        scored.append(
            {
                "score": round(float(score), 4),
                "question": question,
                "answer": answer,
                "method": "embedding",
            }
        )
    scored.sort(key=lambda item: item["score"], reverse=True)
    return scored


def main():
    args = parse_args()
    config = load_json(args.config)
    rows = read_jsonl(config["train_file"])
    requested_method = args.method
    if requested_method == "auto":
        requested_method = config.get("method", "embedding")

    errors = []
    results = []

    if requested_method in {"embedding", "auto"}:
        try:
            results = embedding_scores(args.query, rows, config)
        except Exception as exc:
            errors.append(f"embedding failed: {exc.__class__.__name__}: {exc}")
            if args.method == "embedding" or config.get("method") == "embedding":
                # If embedding is explicitly requested, keep the error but still offer lexical fallback below.
                pass

    if not results:
        results = lexical_scores(args.query, rows, config.get("ngram_size", 2))

    output = {
        "query": args.query,
        "train_file": config["train_file"],
        "requested_method": args.method,
        "effective_method": results[0]["method"] if results else "none",
        "top_k": args.top_k,
        "matches": results[: args.top_k],
        "warnings": errors,
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
