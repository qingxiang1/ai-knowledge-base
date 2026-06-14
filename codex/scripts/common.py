from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Iterable, Iterator, List


def load_json(path: str | Path) -> Dict[str, Any]:
    # Centralized config loading keeps every script on the same JSON-driven pattern.
    with Path(path).open("r", encoding="utf-8") as fh:
        return json.load(fh)


def ensure_dir(path: str | Path) -> Path:
    # Create an output directory if it does not exist yet.
    output = Path(path)
    output.mkdir(parents=True, exist_ok=True)
    return output


def ensure_parent(path: str | Path) -> Path:
    # Create the parent directory before writing a file such as outputs/eval/report.md.
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    return target


def default_hf_cache_dir() -> Path:
    # Keep Hugging Face caches inside the project so generated files are easy to find.
    return ensure_dir(Path(".cache") / "huggingface")


def read_jsonl(path: str | Path) -> List[Dict[str, Any]]:
    # JSONL stores one JSON object per line, which is convenient for training samples.
    rows: List[Dict[str, Any]] = []
    with Path(path).open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                # Skip blank lines so small formatting mistakes do not break the loader.
                continue
            rows.append(json.loads(line))
    return rows


def write_jsonl(path: str | Path, rows: Iterable[Dict[str, Any]]) -> None:
    # Ensure the output folder exists before writing rows.
    target = ensure_parent(path)
    with target.open("w", encoding="utf-8") as fh:
        for row in rows:
            # ensure_ascii=False keeps Chinese text readable in generated datasets.
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")


def normalize_text(text: str) -> str:
    # Normalize whitespace and case before deduplication or similarity matching.
    return " ".join(text.strip().lower().split())


def iter_text_lines(files: Iterable[str | Path]) -> Iterator[str]:
    # Stream non-empty text lines from one or more corpus files.
    for file_path in files:
        with Path(file_path).open("r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line:
                    yield line


def char_ngrams(text: str, n: int = 2) -> set[str]:
    # Convert text into character n-grams for a lightweight lexical similarity check.
    normalized = normalize_text(text).replace(" ", "")
    if not normalized:
        return set()
    if len(normalized) < n:
        return {normalized}
    return {normalized[i : i + n] for i in range(len(normalized) - n + 1)}


def jaccard_similarity(left: str, right: str, n: int = 2) -> float:
    # Jaccard similarity = shared n-grams / all unique n-grams.
    left_ngrams = char_ngrams(left, n=n)
    right_ngrams = char_ngrams(right, n=n)
    if not left_ngrams and not right_ngrams:
        return 1.0
    if not left_ngrams or not right_ngrams:
        return 0.0
    return len(left_ngrams & right_ngrams) / len(left_ngrams | right_ngrams)
