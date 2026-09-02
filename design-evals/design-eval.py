#!/usr/bin/env python3
"""
design-eval — validate CSS properties from design.css against YAML spec scenarios.

Usage:
    python3 design-evals/design-eval.py              # runs all scenarios
    python3 design-evals/design-eval.py home         # runs only "home" scenario
    python3 design-evals/design-eval.py --list       # lists available scenarios

Exit code: 0 if all checks pass, 1 on any failure.
"""

import os
import re
import sys
from pathlib import Path

# --- CSS parser (stdlib only) ---

def parse_css(text: str) -> dict:
    """
    Parse CSS text into {selector: {property: value}}.
    Handles at-rules, pseudo-classes, nested braces, multi-selectors.
    """
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)
    rules = {}

    def extract_blocks(code, base_selector=""):
        i = 0
        while i < len(code):
            while i < len(code) and code[i] in ' \n\r\t':
                i += 1
            if i >= len(code):
                break
            if code[i] == '}':
                break

            if code[i] == '@':
                brace_start = code.find('{', i)
                if brace_start == -1:
                    break
                at_rule = code[i:brace_start].strip()

                depth = 1
                j = brace_start + 1
                while j < len(code) and depth > 0:
                    if code[j] == '{':
                        depth += 1
                    elif code[j] == '}':
                        depth -= 1
                    j += 1

                block_body = code[brace_start+1:j-1] if depth == 0 else code[brace_start+1:]

                if at_rule.startswith('@media'):
                    inner_rules = extract_blocks(block_body, at_rule)
                    rules.update(inner_rules)
                else:
                    inner_rules = extract_blocks(block_body)
                    if base_selector:
                        prefixed = {}
                        for k, v in inner_rules.items():
                            prefixed[f"{base_selector} {k}"] = v
                        rules.update(prefixed)
                    else:
                        rules.update(inner_rules)
                i = j
                continue

            brace_start = code.find('{', i)
            if brace_start == -1:
                break

            selector_raw = code[i:brace_start].strip()

            depth = 1
            j = brace_start + 1
            while j < len(code) and depth > 0:
                if code[j] == '{':
                    depth += 1
                elif code[j] == '}':
                    depth -= 1
                j += 1

            body = code[brace_start+1:j-1] if depth == 0 else code[brace_start+1:]

            props = {}
            for decl in body.split(';'):
                decl = decl.strip()
                if not decl or decl.startswith('/*'):
                    continue
                colon_idx = decl.find(':')
                if colon_idx > 0:
                    pname = decl[:colon_idx].strip().lower()
                    pvalue = decl[colon_idx+1:].strip()
                    if pname and pvalue and not pname.startswith('/*'):
                        props[pname] = pvalue

            selectors = re.split(r'\s*,\s*', selector_raw)
            for sel in selectors:
                sel = sel.strip()
                if not sel:
                    continue
                full_sel = f"{base_selector} {sel}".strip() if base_selector else sel
                if full_sel not in rules:
                    rules[full_sel] = {}
                rules[full_sel].update(props)

            i = j if depth == 0 else j + 1

        return rules

    return extract_blocks(text)


def resolve_vars(css_value: str, root_vars: dict) -> str:
    """Resolve var(--name) references using root variable definitions."""
    def replace_var(m):
        var_name = m.group(1)
        fallback = m.group(2)
        if var_name in root_vars:
            return root_vars[var_name]
        elif fallback:
            return fallback
        return m.group(0)
    return re.sub(r'var\((--[\w-]+)\s*(?:,\s*([^)]+))?\)', replace_var, css_value)


def parse_root_vars(css_text: str) -> dict:
    """Extract :root CSS custom property definitions."""
    vars_dict = {}
    root_match = re.search(r':root\s*\{', css_text)
    if not root_match:
        return vars_dict

    start = root_match.end()
    depth = 1
    i = start
    while i < len(css_text) and depth > 0:
        if css_text[i] == '{':
            depth += 1
        elif css_text[i] == '}':
            depth -= 1
        i += 1

    body = css_text[start:i-1]

    for line in body.split(';'):
        line = line.strip()
        # Strip inline comments, keeping content that follows
        while '/*' in line:
            ci = line.index('/*')
            ci_end = line.find('*/', ci + 2)
            if ci_end == -1:
                line = line[:ci].strip()
                break
            line = (line[:ci] + line[ci_end+2:]).strip()
        if not line:
            continue
        if line.startswith('--') and ':' in line:
            colon_idx = line.index(':')
            name = line[:colon_idx].strip()
            value = line[colon_idx+1:].strip()
            if name and value:
                vars_dict[name] = resolve_vars(value, vars_dict)

    return vars_dict


def normalize_value(val: str) -> str:
    """Normalize a CSS value for comparison."""
    return ' '.join(val.split())


def values_match(expected, actual, root_vars=None, tolerance=None) -> tuple:
    """
    Compare expected vs actual CSS value.
    Returns (matched: bool, detail: str).
    """
    expected = str(expected).strip()
    actual = str(actual).strip()

    if tolerance == "exact":
        norm_exp = normalize_value(expected)
        norm_act = normalize_value(actual)
        if root_vars:
            norm_exp = resolve_vars(norm_exp, root_vars)
            norm_act = resolve_vars(norm_act, root_vars)
        return (norm_exp == norm_act, f"expected '{expected}', got '{actual}'")

    exp_norm = normalize_value(expected)
    act_norm = normalize_value(actual)

    if exp_norm == act_norm:
        return (True, "")

    if root_vars:
        exp_resolved = resolve_vars(exp_norm, root_vars)
        act_resolved = resolve_vars(act_norm, root_vars)

        if exp_resolved == act_resolved:
            return (True, "")
        if exp_norm == act_resolved:
            return (True, "")
        if exp_resolved == act_norm:
            return (True, "")

    return (expected == actual, f"expected '{expected}', got '{actual}'")


def check_scenario(scenario: dict, css_rules: dict, root_vars: dict) -> list:
    """Run all checks in a scenario against parsed CSS rules."""
    results = []
    checks = scenario.get('checks', [])

    for check in checks:
        selector = check.get('selector', '')
        expected = check.get('expected', {})
        tolerance = check.get('tolerance', {})

        if not selector:
            results.append({
                'check': "(no selector)",
                'pass': False,
                'detail': 'Check has no selector'
            })
            continue

        if selector in css_rules:
            actual_props = css_rules[selector]
        else:
            candidates = [s for s in css_rules if selector in s]
            if candidates:
                actual_props = {}
                for c in sorted(candidates, key=len):
                    actual_props.update(css_rules[c])
            else:
                results.append({
                    'check': selector,
                    'pass': False,
                    'detail': f'Selector "{selector}" not found in design.css'
                })
                continue

        all_pass = True
        failures = []

        for prop, exp_value in expected.items():
            if prop in actual_props:
                act_value = actual_props[prop]
                tol = tolerance.get(prop)
                matched, detail = values_match(exp_value, act_value, root_vars, tol)
                if not matched:
                    all_pass = False
                    failures.append(f"  {prop}: {detail}")
            else:
                all_pass = False
                failures.append(f"  {prop}: not declared in CSS for '{selector}'")

        results.append({
            'check': selector,
            'pass': all_pass,
            'detail': '; '.join(failures) if failures else 'OK'
        })

    return results


def main():
    runner_dir = Path(__file__).resolve().parent
    repo_root = runner_dir.parent
    design_css_path = repo_root / 'frontend' / 'public' / 'design.css'
    evals_dir = runner_dir

    if not design_css_path.exists():
        print(f"ERROR: {design_css_path} not found")
        sys.exit(1)

    css_text = design_css_path.read_text()
    root_vars = parse_root_vars(css_text)
    css_rules = parse_css(css_text)

    print(f"Parsed {len(css_rules)} CSS rule selectors from design.css")
    print(f"Resolved {len(root_vars)} CSS custom properties from :root")
    print()

    try:
        import yaml
    except ImportError:
        print("ERROR: PyYAML is required. Install with: pip install pyyaml")
        sys.exit(1)

    scenarios = []
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        if arg == '--list':
            for f in sorted(evals_dir.glob('*.yaml')):
                if f.name == 'design-eval.py':
                    continue
                data = yaml.safe_load(f.read_text())
                print(f"  {f.stem}: {data.get('description', 'no description')}")
            return
        else:
            f = evals_dir / f'{arg}.yaml'
            if not f.exists():
                print(f"ERROR: scenario '{arg}' not found in {evals_dir}")
                avail = [f.stem for f in evals_dir.glob('*.yaml') if f.name != 'design-eval.py']
                print(f"Available: {', '.join(sorted(avail))}")
                sys.exit(1)
            data = yaml.safe_load(f.read_text())
            if data:
                scenarios.append((f.stem, data))
    else:
        for f in sorted(evals_dir.glob('*.yaml')):
            if f.name == 'design-eval.py':
                continue
            data = yaml.safe_load(f.read_text())
            if data:
                scenarios.append((f.stem, data))

    if not scenarios:
        print("ERROR: No scenarios loaded")
        sys.exit(1)

    total_checks = 0
    total_passed = 0
    total_failed = 0

    for name, scenario in scenarios:
        desc = scenario.get('description', name)
        print(f"═══ {name}: {desc} ═══")

        results = check_scenario(scenario, css_rules, root_vars)

        for r in results:
            status = "PASS" if r['pass'] else "FAIL"
            total_checks += 1
            if r['pass']:
                total_passed += 1
            else:
                total_failed += 1
            marker = "✓" if r['pass'] else "✗"
            print(f"  {marker} [{status}] {r['check']}")
            if not r['pass'] and r['detail'] != 'OK':
                for line in r['detail'].split('; '):
                    if line.strip():
                        print(f"       {line}")
        print()

    print(f"═══ SUMMARY ═══")
    print(f"  Total checks: {total_checks}")
    print(f"  Passed:       {total_passed}")
    print(f"  Failed:       {total_failed}")

    if total_failed > 0:
        print(f"\n  ❌ Some checks FAILED")
        sys.exit(1)
    else:
        print(f"\n  ✅ All checks passed!")


if __name__ == '__main__':
    main()