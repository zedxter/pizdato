# Fixtures for detector comparison

Plain UTF-8 Russian prose for the `compare-humanity-detectors` spike. No API keys or secrets.

| ID | Kind | Source | Chars (approx) | Intent |
|----|------|--------|----------------|--------|
| `shipped-a.txt` | shipped | `sindrom-otlozhennoj-zhizni` (published 2026-08-12) | ~5872 | Voice-edited magnet already live |
| `shipped-b.txt` | shipped | `tonkaya-gran-mezhdu-pizdato-i-pizdec` (published 2026-08-11) | ~4535 | Second shipped longform |
| `raw-llm.txt` | control | Fresh unedited LLM magnet-style draft (2026-08-12 spike) | ~1441 | Should look more AI to a useful gate |
| `edited.txt` | middle | Same topic after one voice pass (2026-08-12 spike) | ~1321 | Expect MIXED / mid scores |

Shipped bodies were stripped from `frontend/src/articles.ts` `bodyHtml` (tags removed, entities decoded).
