#!/usr/bin/env python3
"""Score fixture texts with barmyman/distilrubert-ai-detector (CPU-friendly).

Usage (from this change dir, with .venv installed):
  .venv/bin/python score_distilrubert.py
"""
from __future__ import annotations

import json
from pathlib import Path

from transformers import pipeline

MODEL = "barmyman/distilrubert-ai-detector"
# Model card: LABEL_1 = AI, LABEL_0 = Human


def p_ai(result: dict) -> float:
    label, score = result["label"], float(result["score"])
    return score if label == "LABEL_1" else 1.0 - score


def main() -> None:
    root = Path(__file__).resolve().parent
    fixtures = sorted((root / "fixtures").glob("*.txt"))
    clf = pipeline("text-classification", model=MODEL, truncation=True)

    rows = []
    for path in fixtures:
        text = path.read_text(encoding="utf-8").strip()
        trunc = clf(text, truncation=True, max_length=512)[0]
        paras = [p.strip() for p in text.split("\n\n") if len(p.strip()) >= 200]
        para_scores = []
        for para in paras:
            r = clf(para, truncation=True, max_length=512)[0]
            para_scores.append(
                {
                    "p_ai": round(p_ai(r), 4),
                    "label": r["label"],
                    "chars": len(para),
                }
            )
        mean_para = None
        if para_scores:
            total = sum(p["chars"] for p in para_scores)
            mean_para = sum(p["p_ai"] * p["chars"] for p in para_scores) / total

        rows.append(
            {
                "fixture": path.name,
                "chars": len(text),
                "trunc512_p_ai": round(p_ai(trunc), 4),
                "trunc512_label": trunc["label"],
                "para_mean_p_ai": round(mean_para, 4) if mean_para is not None else None,
                "para_max_p_ai": max((p["p_ai"] for p in para_scores), default=None),
                "n_paras_ge_200": len(paras),
            }
        )

    out = root / "scores-distilrubert-summary.json"
    out.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for row in rows:
        print(row)


if __name__ == "__main__":
    main()
