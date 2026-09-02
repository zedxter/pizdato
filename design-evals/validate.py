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

Exit codes: 0 = all pass, 1 = failures detected, 2 = error
"""
import sys, os, json, re, pathlib, argparse, time
import yaml
from playwright.sync_api import sync_playwright

BASE = pathlib.Path(os.path.dirname(os.path.abspath(__file__)))
PROJECT = BASE.parent
DESIGN_FILE = PROJECT / "DESIGN.md"
CHECKS_DIR = BASE

PAGES = {
    "home":    {"url": "https://pizdato.net/",              "checks": "home-checks.json"},
    "feed":    {"url": "https://pizdato.net/lenta",          "checks": "feed-checks.json"},
    "article": {"url": "https://pizdato.net/articles/chto-znachit-pizdato", "checks": "article-checks.json"},
}


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


def normalize_css_color(value):
    """
    Normalize CSS color values for comparison.
    Resolves var() references and converts formats.
    """
    if not isinstance(value, str):
        return str(value)
    # Strip CSS variable references that weren't resolved
    if value.startswith("var("):
        return value  # Leave as-is — test should check resolved value
    return value


def css_value(page, selector, prop):
    """Get computed CSS value for a selector (first match)."""
    try:
        loc = page.locator(selector).first
        if not loc.is_visible():
            return f"<NOT VISIBLE>"
        return loc.evaluate("(el, p) => getComputedStyle(el)[p]", prop)
    except Exception as e:
        return f"<ERROR: {e}>"


def run_validation(page_name, design, checks, viewport):
    """Run all checks for one page, return (total, passed, failed, report_rows)."""
    page_config = PAGES[page_name]
    target = page_config["url"]
    total, passed, failures = 0, 0, 0
    report = []

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport=viewport)
        page.goto(target, wait_until="networkidle", timeout=15000)
        time.sleep(0.5)  # let SPA finish rendering

        for check in checks:
            sel = check["selector"]
            props = check.get("props", [])
            present = page.locator(sel).count() > 0

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

                # Simple equality check (tolerance can be added later)
                if isinstance(expected, str) and expected.startswith("#"):
                    # Convert hex to rgb for comparison (CSS returns rgb())
                    expected_rgb = hex_to_rgb(expected)
                    ok = (actual == expected_rgb or actual == expected)
                else:
                    ok = (actual == expected)

                # Apply tolerance if specified
                if not ok and tolerance:
                    ok = apply_tolerance(actual, expected, tolerance)

                conformance = "OK" if ok else "FAIL"
                report.append({
                    "page": page_name, "selector": sel, "property": prop,
                    "expected": expected, "actual": actual,
                    "ok": ok, "desc": desc
                })

                if ok:
                    passed += 1
                else:
                    failures += 1

        browser.close()

    return total, passed, failures, report


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


def apply_tolerance(actual, expected, tolerance):
    """Apply numeric tolerance to pixel-like values."""
    if isinstance(tolerance, (int, float)):
        try:
            a_val = float(actual.replace("px", ""))
            e_val = float(expected.replace("px", ""))
            return abs(a_val - e_val) <= tolerance
        except (ValueError, AttributeError):
            return False
    return False


def load_checks(page_name):
    """Load checks JSON for a page."""
    checks_file = CHECKS_DIR / PAGES[page_name]["checks"]
    if not checks_file.exists():
        print(f"[ERROR] Checks file not found: {checks_file}")
        return []
    return json.loads(checks_file.read_text(encoding="utf-8"))


def main():
    parser = argparse.ArgumentParser(description="UI Pixel Validation for pizdato.net")
    parser.add_argument("--page", choices=list(PAGES.keys()), help="Validate only this page")
    parser.add_argument("--viewport", default="1280x800", help="Viewport size WxH")
    args = parser.parse_args()

    design = parse_design_tokens(DESIGN_FILE)
    parts = args.viewport.split("x")
    viewport = {"width": int(parts[0]), "height": int(parts[1])}

    pages_to_run = [args.page] if args.page else list(PAGES.keys())

    grand_total, grand_passed, grand_failures = 0, 0, 0
    all_reports = []

    for page_name in pages_to_run:
        checks = load_checks(page_name)
        if not checks:
            print(f"[SKIP] {page_name}: no checks found")
            continue

        print(f"\n{'='*72}")
        print(f"  PAGE: {page_name.upper()}  —  {PAGES[page_name]['url']}")
        print(f"{'='*72}")

        total, passed, failures, report = run_validation(
            page_name, design, checks, viewport
        )
        grand_total += total
        grand_passed += passed
        grand_failures += failures
        all_reports.extend(report)

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