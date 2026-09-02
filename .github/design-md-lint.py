#!/usr/bin/env python3
"""
DESIGN.md linter — validate structure, required tokens, and reference syntax.

Validates:
1. DESIGN.md exists and is readable
2. YAML frontmatter is valid YAML
3. All required top-level keys are present
4. Token references in `components` use valid keys from the same spec
5. No obvious encoding/formatting corruption

Usage:
    python3 design-md-lint.py [path/to/DESIGN.md]

Exit code: 0 if valid, 1 on any validation failure.
"""

import re
import sys
from pathlib import Path


REQUIRED_KEYS = {'version', 'name', 'description', 'colors', 'typography',
                 'rounded', 'spacing', 'components'}

# Sections that serve as reference targets for {section.key} tokens
REFERENCE_SECTIONS = {'colors', 'typography', 'rounded', 'spacing', 'components'}


def lint_design_md(path: Path) -> bool:
    """Lint DESIGN.md. Returns True if valid, False if issues found."""
    if not path.exists():
        print(f"ERROR: {path} not found")
        return False

    text = path.read_text()
    errors = []

    # 1. Parse frontmatter (between --- delimiters)
    frontmatch = re.match(r'^---\s*\n(.*?)\n---', text, re.DOTALL)
    if not frontmatch:
        errors.append("Missing or malformed YAML frontmatter (must start and end with ---)")
    else:
        front_raw = frontmatch.group(1)

        # Validate YAML
        try:
            import yaml
            data = yaml.safe_load(front_raw)
        except ImportError:
            # Manual parse fallback
            data = _parse_simple_yaml(front_raw)
        except yaml.YAMLError as e:
            errors.append(f"YAML syntax error in frontmatter: {e}")
            data = None

        if not data or not isinstance(data, dict):
            errors.append("Frontmatter must be a valid YAML mapping (dictionary)")
            data = data or {}

        # 2. Check required keys
        missing = REQUIRED_KEYS - set(data.keys())
        if missing:
            errors.append(f"Missing required top-level keys: {', '.join(sorted(missing))}")

        # 3. Validate token references in components
        if 'components' in data and isinstance(data['components'], dict):
            _validate_token_refs(data['components'], data, errors)

        # 4. Validate colors have hex/rgba values
        if 'colors' in data and isinstance(data['colors'], dict):
            for color_name, color_val in data['colors'].items():
                val = str(color_val)
                if not re.match(r'^(?:#[0-9a-fA-F]{3,8}|[a-z]+\([^)]+\))$', val):
                    errors.append(
                        f"Color '{color_name}' value '{val}' is not a valid hex or functional notation"
                    )

        # 5. Validate typography tokens have required sub-keys
        if 'typography' in data and isinstance(data['typography'], dict):
            for type_name, type_spec in data['typography'].items():
                if isinstance(type_spec, dict):
                    if 'fontFamily' not in type_spec:
                        errors.append(f"Typography '{type_name}' missing 'fontFamily'")

    # 6. Check markdown body
    body = text[frontmatch.end():].strip() if frontmatch else text.strip()
    if not body:
        errors.append("DESIGN.md has no content after frontmatter")

    # 7. Check for encoding corruption
    if '\x00' in text:
        errors.append("File contains null bytes — possible corruption")

    # Report
    if errors:
        print(f"DESIGN.md lint: {len(errors)} issue(s)")
        for e in errors:
            print(f"  ✗ {e}")
        return False
    else:
        print("DESIGN.md lint: OK")
        return True


def _validate_token_refs(components: dict, spec: dict, errors: list):
    """Check that {section.key} token references are valid."""
    for comp_name, comp_def in components.items():
        if not isinstance(comp_def, dict):
            continue
        for prop_name, prop_val in comp_def.items():
            val = str(prop_val)
            # Find all {section.key} references
            for m in re.finditer(r'\{(\w+)\.([^}]+)\}', val):
                section = m.group(1)
                key = m.group(2).strip()
                if section not in REFERENCE_SECTIONS:
                    errors.append(
                        f"Component '{comp_name}.{prop_name}': unknown section '{section}' in token '{m.group(0)}'"
                    )
                elif section not in spec:
                    errors.append(
                        f"Component '{comp_name}.{prop_name}': section '{section}' not defined in spec (token '{m.group(0)}')"
                    )
                elif isinstance(spec.get(section), dict) and key not in spec[section]:
                    errors.append(
                        f"Component '{comp_name}.{prop_name}': key '{key}' not found in section '{section}' (token '{m.group(0)}')"
                    )


def _parse_simple_yaml(text: str) -> dict:
    """Minimal YAML parser for our specific frontmatter format (key: value)."""
    result = {}
    current_section = None
    section_data = {}

    for line in text.split('\n'):
        line = line.rstrip()
        if not line or line.strip().startswith('#'):
            continue

        # Top-level key (section start)
        m = re.match(r'^(\w+):\s*(.*)', line)
        if m:
            key = m.group(1)
            val = m.group(2).strip()
            if current_section:
                result[current_section] = dict(section_data)
                section_data = {}
            if val:
                # Simple scalar value
                result[key] = val.strip('"\'')
                current_section = None
            else:
                # Start of a section
                current_section = key
            continue

        # Sub-key (indented)
        m = re.match(r'^\s{2,}(\S[^:]*):\s*(.*)', line)
        if m and current_section:
            sub_key = m.group(1).strip()
            sub_val = m.group(2).strip()
            if sub_val:
                section_data[sub_key] = sub_val.strip('"\'')
            else:
                # Sub-sub section (e.g., typography with sub-objects)
                section_data[sub_key] = _parse_sub_object(line, text)
            continue

    if current_section:
        result[current_section] = dict(section_data)

    return result


def _parse_sub_object(first_line: str, full_text: str) -> dict:
    """Parse a sub-object (indented block). Minimal implementation."""
    return {}  # Placeholder — use PyYAML for full parsing


def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else \
           Path(__file__).resolve().parent.parent / 'DESIGN.md'

    valid = lint_design_md(path)
    sys.exit(0 if valid else 1)


if __name__ == '__main__':
    main()