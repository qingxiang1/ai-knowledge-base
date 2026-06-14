from __future__ import annotations

import argparse
import json
from pathlib import Path

from common import ensure_parent, read_jsonl


def parse_args():
    parser = argparse.ArgumentParser(
        description="Generate a Markdown business evaluation report from predictions JSONL."
    )
    parser.add_argument("--predictions", required=True, help="Path to predictions JSONL.")
    parser.add_argument("--metrics", help="Optional path to metrics JSON.")
    parser.add_argument("--output", required=True, help="Output Markdown path.")
    parser.add_argument("--top-k", type=int, default=20, help="Max rows to render in detail.")
    return parser.parse_args()


def load_metrics(path: str | None):
    # Metrics are optional; sample reports can be generated from predictions only.
    if not path:
        return {}
    with Path(path).open("r", encoding="utf-8") as fh:
        return json.load(fh)


def classify_row(row):
    # Exact match is strict and mainly useful for short deterministic answers.
    if row.get("exact_match", 0) == 1.0:
        return "exact_match"
    # Keyword coverage is a lightweight proxy for whether key business steps appear.
    if row.get("keyword_coverage", 0) >= 0.8:
        return "partial_pass"
    return "needs_review"


def render_row(index, row):
    nearest = row.get("nearest_training_examples", [])
    nearest_md = "无"
    if nearest:
        # Render only the nearest example to keep the report readable.
        nearest_md = (
            f"相似度 `{nearest[0].get('score', 0)}`\n\n"
            f"问题：{nearest[0].get('question', '')}\n\n"
            f"答案：{nearest[0].get('answer', '')}"
        )

    # Keep each row human-reviewable: question, reference, prediction, metrics.
    lines = [
        f"### 样本 {index}",
        f"- 分类：`{classify_row(row)}`",
        f"- 问题：{row.get('question', '')}",
        f"- 参考答案：{row.get('reference', '')}",
        f"- 模型预测：{row.get('prediction', '')}",
        f"- Exact Match：`{row.get('exact_match', 0)}`",
        f"- Keyword Coverage：`{row.get('keyword_coverage', 0)}`",
        f"- 最近训练样本：{nearest_md}",
        "",
    ]
    return "\n".join(lines)


def main():
    args = parse_args()
    rows = read_jsonl(args.predictions)
    metrics = load_metrics(args.metrics)

    # Aggregate simple counts for the report overview.
    exact_match_count = sum(1 for row in rows if row.get("exact_match", 0) == 1.0)
    partial_pass_count = sum(1 for row in rows if row.get("keyword_coverage", 0) >= 0.8)
    needs_review_count = len(rows) - partial_pass_count

    # Build Markdown sections as strings; this keeps the report easy to customize.
    sections = [
        "# 业务评测报告",
        "",
        "## 总览",
        f"- 样本总数：`{len(rows)}`",
        f"- Exact Match 条数：`{exact_match_count}`",
        f"- Keyword Coverage >= 0.8 条数：`{partial_pass_count}`",
        f"- 需要重点复核条数：`{needs_review_count}`",
    ]

    if metrics:
        sections.extend(
            [
                "",
                "## 指标",
                f"- 平均 Exact Match：`{metrics.get('avg_exact_match', 0)}`",
                f"- 平均 Keyword Coverage：`{metrics.get('avg_keyword_coverage', 0)}`",
                f"- 平均回答长度：`{metrics.get('avg_prediction_chars', 0)}`",
            ]
        )

    sections.extend(["", "## 详细样本", ""])

    # Limit detailed rows so large evaluation files do not create enormous reports.
    for index, row in enumerate(rows[: args.top_k], start=1):
        sections.append(render_row(index, row))

    output_path = ensure_parent(args.output)
    output_path.write_text("\n".join(sections), encoding="utf-8")
    print(f"Report saved to {output_path}")


if __name__ == "__main__":
    main()
