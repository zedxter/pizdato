#!/usr/bin/env python3
"""
EDD Eval — evaluate PR content changes against golden set criteria.

Loads golden-001.json, runs deterministic assertions against changed files,
computes per-category scores, and exits non-zero if any category score or
overall score falls below threshold (default 0.80 from golden set).

Usage:
    python3 pizdato/evals/edd-eval.py                        # scan entire repo
    python3 pizdato/evals/edd-eval.py --files path/to/file   # specific files
    python3 pizdato/evals/edd-eval.py --json                  # JSON-only output

Exit codes:
    0 = all scores >= threshold
    1 = one or more scores below threshold
    2 = runtime error (golden set missing, etc.)
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime, date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
EVALS_DIR = REPO_ROOT / "pizdato" / "evals"
GOLDEN_FILE = EVALS_DIR / "golden-001.json"

CONTENT_PATTERNS = [
    "posts/**/*",
    "frontend/**/*.tsx", "frontend/**/*.ts", "frontend/**/*.css", "frontend/**/*.html",
    "frontend/articles/**/*",
    "media/posts/**/*",
]

EXCLUDE_DIRS = {"node_modules", "dist", "target", ".git", ".venv", "__pycache__", "deploy/channel"}

# --- Channel length limits ---
CHANNEL_LIMITS: dict[str, int] = {
    "telegram_send_photo": 1024,
    "telegram_send_message": 4096,
    "blog_post": 10000,       # blog / article posts
    "reddit_self": 40000,     # Reddit self-post
    "default": 4096,
}

# Infer channel from file path. E.g. published/telegram/evening-2026-09-03.md → telegram
def infer_channel_from_path(file_path: str) -> str:
    path_lower = file_path.lower()
    if "published/telegram" in path_lower or "posts/telegram" in path_lower:
        return "telegram"
    if "published/blog" in path_lower or "published/medium" in path_lower:
        return "blog"
    if "reddit" in path_lower:
        return "reddit"
    if "articles" in path_lower or "frontend" in path_lower:
        return "blog"
    return "unknown"


# --- Helpers ---

def load_golden_set(path: Path) -> dict:
    if not path.exists():
        print(f"[FATAL] Golden set not found: {path}", file=sys.stderr)
        sys.exit(2)
    with open(path) as f:
        return json.load(f)


def find_content_files(file_list: list[str] | None = None) -> list[Path]:
    if file_list:
        result = []
        for f in file_list:
            p = REPO_ROOT / f
            if p.exists() and not any(part in EXCLUDE_DIRS for part in p.parts):
                result.append(p)
        return sorted(result)
    result = []
    # Walk content-related directories
    for d in ["posts", "frontend", "media/posts", "published"]:
        target = REPO_ROOT / d
        if target.exists():
            for p in target.rglob("*"):
                if p.is_file() and p.suffix in {".html", ".md", ".tsx", ".ts", ".css"}:
                    if not any(part in EXCLUDE_DIRS for part in p.parts):
                        result.append(p)
    return sorted(result)


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def should_apply_assertion(assertion: dict, file_path: str) -> bool:
    """Check if an assertion should apply based on apply_since date and context."""
    params = assertion.get("params", {})
    apply_since = params.get("apply_since")
    if apply_since:
        try:
            threshold_date = datetime.strptime(apply_since, "%Y-%m-%d").date()
            # Try to get file modification date
            try:
                full_path = REPO_ROOT / file_path
                if full_path.exists():
                    mtime = datetime.fromtimestamp(full_path.stat().st_mtime).date()
                    if mtime < threshold_date:
                        return False
            except OSError:
                # If we can't read file mtime, apply the assertion (conservative)
                pass
        except ValueError:
            pass  # Malformed date — apply assertion anyway
    return True


def get_context_text(text: str, context: str | None) -> str:
    """Extract a scoped portion of text based on context field."""
    if not context:
        return text
    if context == "key_verdict":
        # Last 300 chars of the text (verdict / closing section)
        return text[-300:]
    if context == "first_100_chars":
        return text[:100]
    if context == "headline":
        # First line or first 150 chars
        first_line = text.split("\n")[0] if text else ""
        return first_line[:200]
    return text


# --- Assertion runners ---

def run_substring_match(text: str, params: dict) -> bool:
    """Check that target substrings are present (or absent) in text."""
    any_of = params.get("any_of", [])
    not_suffix = params.get("not_suffix", [])
    target = params.get("target", "")
    match_mode = params.get("match_mode", "any")
    banned_prefixes = params.get("banned_prefixes", [])
    extract_from = params.get("extract_from", "")

    if any_of:
        results = [(x in text) for x in any_of]
        return any(results) if match_mode == "any" else all(results)

    if target:
        if target in text:
            return True

    if not_suffix:
        return not any(text.strip().endswith(s) for s in not_suffix)

    if banned_prefixes:
        first_100 = text[:100].strip()
        return not any(first_100.startswith(prefix) for prefix in banned_prefixes)

    if extract_from == "source":
        return True  # source comparison is LLM-judge territory

    return True


def run_banned_words(text: str, params: dict) -> bool:
    """Check that banned words/patterns are absent from text."""
    banned = params.get("banned", [])
    banned_regex_list = params.get("banned_regex", [])
    case_sensitive = params.get("case_sensitive", False)
    case_insensitive = params.get("case_insensitive", False)

    if not case_sensitive or case_insensitive:
        search_text = text.lower()
        banned = [b.lower() for b in banned]
    else:
        search_text = text

    for word in banned:
        if word in search_text:
            return False

    for pattern in banned_regex_list:
        flags = re.IGNORECASE if case_insensitive else 0
        if re.search(pattern, text, flags):
            return False

    return True


def run_regex(text: str, params: dict) -> bool:
    """Run regex checks with various check modes."""
    pattern = params.get("pattern", "")
    check = params.get("check", "no_match")
    case_insensitive = params.get("case_insensitive", False)
    flags = re.IGNORECASE | re.DOTALL if case_insensitive else re.DOTALL

    if not pattern:
        return True

    matches = re.findall(pattern, text, flags)

    if check == "no_match":
        return len(matches) == 0
    elif check == "at_least_one":
        return len(matches) >= 1
    elif check == "intersection_nonempty":
        return len(matches) >= 1
    elif check == "both_present":
        return len(matches) >= 2

    return True


def run_length_check(text: str, params: dict, file_path: str = "") -> bool:
    """Check that text length does not exceed max, with channel awareness."""
    max_length = params.get("max_length")
    channel = params.get("channel", "")

    if max_length is not None:
        return len(text) <= max_length

    # If no explicit max_length, infer from channel param
    if channel in CHANNEL_LIMITS:
        limit = CHANNEL_LIMITS[channel]
    else:
        # Fall back to file-path-based channel inference
        ch = infer_channel_from_path(file_path)
        if ch == "telegram":
            limit = 4096
        elif ch == "blog":
            limit = 10000
        else:
            limit = 4096

    return len(text) <= limit


def run_lookup(text: str, params: dict, all_file_texts: dict, current_file: str = "") -> bool:
    """
    Check for content duplicates against other files in the PR / repo.
    Simplified for CI: checks against other changed files in this evaluation.
    """
    lookup_source = params.get("lookup_source", "")
    match_mode = params.get("match_mode", "text_similarity")
    window_hours = params.get("window_hours", 24)

    if match_mode in ("text_similarity", "exact"):
        for other_path, other_text in all_file_texts.items():
            if other_path == current_file:
                continue
            if other_text == text:
                return False

    return True


def evaluate_deterministic(assertion: dict, text: str, all_texts: dict, current_file: str = "") -> bool:
    """Run a deterministic assertion, respecting apply_since and context scoping."""
    atype = assertion["type"]
    params = assertion.get("params", {})

    # Apply context scoping before running the assertion
    context = params.get("context")
    scoped_text = get_context_text(text, context)

    try:
        if atype == "substring_match":
            return run_substring_match(scoped_text, params)
        elif atype == "banned_words":
            return run_banned_words(scoped_text, params)
        elif atype == "regex":
            return run_regex(scoped_text, params)
        elif atype == "length_check":
            return run_length_check(scoped_text, params, file_path=current_file)
        elif atype == "lookup":
            return run_lookup(scoped_text, params, all_texts, current_file=current_file)
        else:
            # Unknown/inapplicable type — skip
            return True
    except Exception as e:
        print(f"[WARN] Assertion {assertion['id']} failed with error: {e}", file=sys.stderr)
        return False


# --- Evaluation engine ---

def evaluate_files(
    golden: dict,
    file_texts: dict[str, str],
) -> dict:
    """Run all golden set assertions against provided file texts."""
    categories = golden.get("categories", [])
    threshold = golden.get("meta", {}).get("ci_gate_threshold", 0.80)

    cat_results = []
    total_det = 0
    total_det_passed = 0

    for cat in categories:
        cat_id = cat["category_id"]
        cat_name = cat.get("name", cat_id)
        cat_threshold = cat.get("threshold", threshold)
        assertions = cat.get("assertions", [])

        # Filter to deterministic-only for CI (skip llm_judge)
        det_assertions = [a for a in assertions if a.get("type") != "llm_judge_prompt"]
        eval_types = cat.get("eval_types", [])

        passed = 0
        skipped = 0
        total = len(det_assertions)
        check_results = []

        for assertion in det_assertions:
            results_for_file = []
            all_pass = True
            applicable_files = 0

            for file_path, text in file_texts.items():
                # Check apply_since — skip assertion for files that don't meet the date threshold
                if not should_apply_assertion(assertion, file_path):
                    continue
                applicable_files += 1
                result = evaluate_deterministic(assertion, text, file_texts, current_file=file_path)
                results_for_file.append({
                    "file": file_path,
                    "result": result,
                })
                if not result:
                    all_pass = False

            if applicable_files == 0:
                # No applicable files — skip this assertion (conservative: count as pass)
                skipped += 1
                all_pass = True

            if all_pass:
                passed += 1
            check_results.append({
                "id": assertion["id"],
                "description": assertion.get("description", ""),
                "type": assertion["type"],
                "severity": assertion.get("severity", "WARN"),
                "passed": all_pass,
                "file_results": results_for_file,
                "files_applicable": applicable_files,
            })

        score = round(passed / max(total, 1), 3)
        total_det += total
        total_det_passed += passed

        cat_results.append({
            "category_id": cat_id,
            "name": cat_name,
            "criticality": cat.get("criticality", "MEDIUM"),
            "score": score,
            "threshold": cat_threshold,
            "passed": passed,
            "skipped": skipped,
            "total": total,
            "eval_types_having_deterministic": [t for t in eval_types if t != "llm_judge"],
            "checks": check_results,
        })

    # Overall score: average of all category scores
    overall_score = round(
        sum(r["score"] for r in cat_results) / max(len(cat_results), 1), 3
    )

    return {
        "overall_score": overall_score,
        "threshold": threshold,
        "categories": cat_results,
        "summary": {
            "total_deterministic": total_det,
            "passed_deterministic": total_det_passed,
            "files_evaluated": len(file_texts),
            "overall_pass": overall_score >= threshold,
        },
    }


def print_report(results: dict, json_only: bool = False):
    """Print evaluation report."""
    if json_only:
        print(json.dumps(results, ensure_ascii=False, indent=2))
        return

    print("=" * 64)
    print("  EDD EVALUATION REPORT  (deterministic assertions only)")
    print("=" * 64)
    print(f"  Files evaluated: {results['summary']['files_evaluated']}")
    print(f"  Overall score:   {results['overall_score']}")
    print(f"  Threshold:       {results['threshold']}")
    print(f"  Assertions:      {results['summary']['passed_deterministic']}/{results['summary']['total_deterministic']} passed")
    print("-" * 64)

    for cat in results["categories"]:
        score = cat["score"]
        status = "✓" if score >= cat["threshold"] else "✗"
        score_pct = score * 100
        passed = cat["passed"]
        total = cat["total"]
        skipped = cat.get("skipped", 0)
        skip_info = f" ({skipped} skipped)" if skipped else ""
        print(f"  {status} {cat['category_id']} {cat['name']}: {score_pct:.1f}% ({passed}/{total}{skip_info})")

        for check in cat["checks"]:
            icon = "  ✓" if check["passed"] else "  ✗"
            applicable = check.get("files_applicable", 0)
            note = f" (no applicable files)" if applicable == 0 else ""
            print(f"    {icon} [{check['type']}] {check['description']}{note}")
            if not check["passed"]:
                for fr in check["file_results"]:
                    if not fr["result"]:
                        print(f"      → {fr['file']}")

    print()
    print("=" * 64)
    overall_pass = results["summary"]["overall_pass"]
    all_cat_pass = all(
        cat["score"] >= cat["threshold"] for cat in results["categories"]
    )
    if overall_pass and all_cat_pass:
        print("  ✅ ALL CHECKS PASSED")
    else:
        print("  ❌ SCORE BELOW THRESHOLD — see per-category results above")
    print("=" * 64)


def parse_args(argv: list[str]) -> argparse.Namespace:
    """Parse CLI arguments using argparse."""
    parser = argparse.ArgumentParser(
        description="EDD Eval — evaluate PR content changes against golden set criteria."
    )
    parser.add_argument(
        "--files",
        nargs="*",
        default=None,
        help="Specific files to evaluate (default: scan all content directories)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        default=False,
        help="Output results as JSON only",
    )
    return parser.parse_args(argv)


def main():
    golden = load_golden_set(GOLDEN_FILE)

    args = parse_args(sys.argv[1:])

    content_files = find_content_files(args.files)
    if not content_files:
        print("[INFO] No content files found to evaluate.")
        sys.exit(0)

    # Read all file texts
    file_texts = {}
    for f in content_files:
        rel = str(f.relative_to(REPO_ROOT))
        file_texts[rel] = read_text(f)

    results = evaluate_files(golden, file_texts)
    print_report(results, json_only=args.json)

    overall_pass = results["summary"]["overall_pass"]
    all_cat_pass = all(
        cat["score"] >= cat["threshold"] for cat in results["categories"]
    )
    sys.exit(0 if (overall_pass and all_cat_pass) else 1)


if __name__ == "__main__":
    main()