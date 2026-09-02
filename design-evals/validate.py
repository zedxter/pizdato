"""
UI Pixel Validation — pizdato.net against DESIGN.md (headless Playwright).

Validates computed CSS properties of live DOM elements against DESIGN.md
tokens for three key pages: homepage (/), feed (/lenta), and articles (/articles/*).

Usage:
  cd /home/danil/projects/pizdato
  python3 design-evals/validate.py                 # validates all pages
  python3 design-evals/validate.py --page home     # homepage only
  python3 design-evals/validate.py --page feed     # feed only
  python3 design-evals/validate.py --page article  # article only
  python3 design-evals/validate.py --base-url http://127.0.0.1:4173
  python3 design-evals/validate.py --article-slug chto-znachit-pizdato

Exit codes: 0 = all pass, 1 = failures detected, 2 = error
"""
import sys, os, json, re, pathlib, argparse
import yaml
from playwright.sync_api import sync_playwright

BASE = pathlib.Path(os.path.dirname(os.path.abspath(__file__)))
PROJECT = BASE.parent
DESIGN_FILE = PROJECT / "DESIGN.md"
CHECKS_DIR = BASE

DEFAULT_BASE_URL = "https://pizdato.net"
DEFAULT_ARTICLE_SLUG = "chto-znachit-pizdato"
PAGE_CHECKS = {
    "home": "home-checks.json",
    "feed": "feed-checks.json",
    "article": "article-checks.json",
}


def build_pages(base_url, article_slug):
    """Build page URL + checks-file map from a deploy base and article slug."""
    base = base_url.rstrip("/")
    slug = str(article_slug).strip("/")
    return {
        "home": {"url": f"{base}/", "checks": PAGE_CHECKS["home"]},
        "feed": {"url": f"{base}/lenta", "checks": PAGE_CHECKS["feed"]},
        "article": {
            "url": f"{base}/articles/{slug}",
            "checks": PAGE_CHECKS["article"],
        },
    }


def parse_args(argv=None):
    """Parse CLI arguments for the pixel validator."""
    parser = argparse.ArgumentParser(description="UI Pixel Validation for pizdato.net")
    parser.add_argument("--page", choices=list(PAGE_CHECKS.keys()), help="Validate only this page")
    parser.add_argument("--viewport", default="1280x800", help="Viewport size WxH")
    parser.add_argument(
        "--base-url",
        default=DEFAULT_BASE_URL,
        help="Deploy origin used to build page URLs",
    )
    parser.add_argument(
        "--article-slug",
        default=DEFAULT_ARTICLE_SLUG,
        help="Article slug used in the /articles/<slug> URL",
    )
    return parser.parse_args(argv)


def parse_design_tokens(path):
    """Parse DESIGN.md frontmatter YAML into a token dict."""
    text = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    return yaml.safe_load(m.group(1)) if m else yaml.safe_load(text)


def resolve_token(value, design, _depth=0):
    """
    Resolve token references recursively:
    'colors.primary' -> #0C1210
    '{colors.primary}' -> #0C1210 (brace-wrapped)
    'components.button-primary.backgroundColor' -> resolved chain
    """
    if _depth > 10 or not isinstance(value, str):
        return value
    # Strip braces if wrapped
    if value.startswith("{") and value.endswith("}"):
        value = value.strip("{}")
    node = design
    for part in value.split("."):
        if isinstance(node, dict):
            node = node.get(part)
        else:
            return value
        if node is None:
            return value
    # If result is itself a reference, resolve recursively
    if isinstance(node, str) and (node.startswith("{") and node.endswith("}")):
        return resolve_token(node, design, _depth + 1)
    return node


def hex_to_rgb(h):
    """Convert #RRGGBB to rgb(R, G, B) string."""
    h = h.lstrip("#").strip()
    if len(h) == 6:
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        return f"rgb({r}, {g}, {b})"
    elif len(h) == 3:
        r, g, b = int(h[0]*2, 16), int(h[1]*2, 16), int(h[2]*2, 16)
        return f"rgb({r}, {g}, {b})"
    return h


def normalize_css_color(value):
    """
    Normalize CSS color values for comparison.
    Converts hex to rgb() and canonicalizes rgb() spacing.
    """
    if not isinstance(value, str):
        return str(value)
    value = value.strip()
    if value.startswith("var("):
        return value
    if value.startswith("#"):
        return hex_to_rgb(value)
    m = re.match(
        r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)",
        value,
        re.I,
    )
    if m:
        return f"rgb({int(m.group(1))}, {int(m.group(2))}, {int(m.group(3))})"
    return value


def css_values_match(actual, expected):
    """Compare computed and expected CSS values, normalizing colors."""
    expected_s = str(expected) if expected is not None else ""
    actual_s = str(actual) if actual is not None else ""
    if expected_s == "linear-gradient(...)":
        return "linear-gradient(" in actual_s
    return normalize_css_color(actual_s) == normalize_css_color(expected_s)


def css_value(page, selector, prop):
    """Get computed CSS value for a selector (first match)."""
    try:
        loc = page.locator(selector).first
    except Exception as e:
        print(f"[ERROR] locator failed for {selector}: {e}")
        return f"<ERROR: {e}>"

    try:
        visible = loc.is_visible()
    except Exception as e:
        print(f"[ERROR] is_visible failed for {selector}: {e}")
        return f"<ERROR: {e}>"
    if not visible:
        return "<NOT VISIBLE>"

    try:
        return loc.evaluate("(el, p) => getComputedStyle(el)[p]", prop)
    except Exception as e:
        print(f"[ERROR] evaluate failed for {selector}.{prop}: {e}")
        return f"<ERROR: {e}>"


def _fail_all_checks(page_name, checks, actual, total, passed, failures, report):
    """Record every check as a failure with the given actual value."""
    for check in checks:
        sel = check["selector"]
        for prop_def in check.get("props", []):
            total += 1
            failures += 1
            report.append({
                "page": page_name, "selector": sel, "property": prop_def["property"],
                "expected": prop_def.get("token", ""), "actual": actual,
                "ok": False, "desc": prop_def.get("desc", ""),
            })
    return total, passed, failures, report


def run_validation(page_name, page_config, design, checks, viewport, browser):
    """Run all checks for one page, return (total, passed, failed, report_rows)."""
    target = page_config["url"]
    total, passed, failures = 0, 0, 0
    report = []

    page = browser.new_page(viewport=viewport)
    try:
        try:
            page.goto(target, wait_until="networkidle", timeout=15000)
        except Exception as e:
            print(f"[ERROR] Failed to navigate to {target}: {e}")
            return _fail_all_checks(
                page_name, checks, f"<ERROR: {e}>", total, passed, failures, report
            )

        if checks:
            first_sel = checks[0]["selector"]
            try:
                page.wait_for_selector(first_sel, timeout=15000)
            except Exception as e:
                print(f"[ERROR] wait_for_selector({first_sel}) failed: {e}")

        for check in checks:
            sel = check["selector"]
            props = check.get("props", [])
            try:
                present = page.locator(sel).count() > 0
            except Exception as e:
                print(f"[ERROR] locator.count failed for {sel}: {e}")
                for prop_def in props:
                    total += 1
                    failures += 1
                    report.append({
                        "page": page_name, "selector": sel, "property": prop_def["property"],
                        "expected": prop_def.get("token", ""), "actual": f"<ERROR: {e}>",
                        "ok": False, "desc": prop_def.get("desc", ""),
                    })
                continue

            for prop_def in props:
                prop = prop_def["property"]
                token_path = prop_def["token"]
                desc = prop_def.get("desc", "")
                tolerance = prop_def.get("tolerance", None)

                total += 1

                if not present:
                    report.append({
                        "page": page_name, "selector": sel, "property": prop,
                        "expected": token_path, "actual": "<NOT FOUND>",
                        "ok": False, "desc": desc
                    })
                    failures += 1
                    continue

                actual = css_value(page, sel, prop)
                expected_raw = resolve_token(token_path, design)
                expected = str(expected_raw) if expected_raw is not None else token_path

                ok = css_values_match(actual, expected)
                if not ok and tolerance:
                    ok = apply_tolerance(actual, expected, tolerance)

                report.append({
                    "page": page_name, "selector": sel, "property": prop,
                    "expected": expected, "actual": actual,
                    "ok": ok, "desc": desc
                })

                if ok:
                    passed += 1
                else:
                    failures += 1
    finally:
        page.close()

    return total, passed, failures, report


def apply_tolerance(actual, expected, tolerance):
    """Apply numeric tolerance to values with any unit suffix (px, rem, em, …)."""
    if isinstance(tolerance, (int, float)):
        try:
            a_m = re.search(r"[\d.]+", str(actual))
            e_m = re.search(r"[\d.]+", str(expected))
            if not a_m or not e_m:
                return False
            return abs(float(a_m.group(0)) - float(e_m.group(0))) <= tolerance
        except (ValueError, AttributeError):
            return False
    return False


def load_checks(page_name):
    """Load checks JSON for a page."""
    checks_file = CHECKS_DIR / PAGE_CHECKS[page_name]
    if not checks_file.exists():
        print(f"[ERROR] Checks file not found: {checks_file}")
        return []
    return json.loads(checks_file.read_text(encoding="utf-8"))


def main(argv=None):
    args = parse_args(argv)
    pages = build_pages(args.base_url, args.article_slug)

    design = parse_design_tokens(DESIGN_FILE)
    parts = args.viewport.split("x")
    viewport = {"width": int(parts[0]), "height": int(parts[1])}

    pages_to_run = [args.page] if args.page else list(pages.keys())

    grand_total, grand_passed, grand_failures = 0, 0, 0
    all_reports = []

    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            for page_name in pages_to_run:
                checks = load_checks(page_name)
                if not checks:
                    print(f"[SKIP] {page_name}: no checks found")
                    continue

                print(f"\n{'='*72}")
                print(f"  PAGE: {page_name.upper()}  —  {pages[page_name]['url']}")
                print(f"{'='*72}")

                total, passed, failures, report = run_validation(
                    page_name, pages[page_name], design, checks, viewport, browser
                )
                grand_total += total
                grand_passed += passed
                grand_failures += failures
                all_reports.extend(report)
        finally:
            browser.close()

    # Print summary table
    print(f"\n{'='*72}")
    print(f"  PIXEL VALIDATION REPORT")
    print(f"{'='*72}")
    if not all_reports:
        print("  No checks were executed.")
        sys.exit(2)

    for r in all_reports:
        icon = "✓" if r["ok"] else "✗"
        print(f"  [{icon}] {r['page']:<8} | {r['selector']:<32} | {r['property']:<18} | "
              f"got={r['actual'][:28]:<28} | want={r['expected'][:28]:<28} | {r['desc']}")

    print(f"{'='*72}")
    print(f"  RESULT: {grand_passed}/{grand_total} passed  |  "
          f"{grand_failures} failures")
    cert = "ДА" if grand_failures == 0 else "НЕТ"
    print(f"  CERTIFICATE: Соответствует DESIGN.md до пикселя: {cert}")
    print(f"{'='*72}")

    sys.exit(1 if grand_failures else 0)


if __name__ == "__main__":
    main()
