"""Unit tests for design-evals/validate.py helpers."""
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock

# Playwright is a runtime-only dependency of the validator CLI.
sys.modules.setdefault("playwright", MagicMock())
sys.modules.setdefault("playwright.sync_api", MagicMock())

from validate import (  # noqa: E402
    apply_tolerance,
    build_pages,
    css_values_match,
    normalize_css_color,
    parse_args,
    run_validation,
)


class ApplyToleranceTests(unittest.TestCase):
    def test_px_within_tolerance(self):
        self.assertTrue(apply_tolerance("16px", "16px", 0))
        self.assertTrue(apply_tolerance("20px", "16px", 4))
        self.assertFalse(apply_tolerance("21px", "16px", 4))

    def test_rem_within_tolerance(self):
        self.assertTrue(apply_tolerance("44rem", "44rem", 8))
        self.assertTrue(apply_tolerance("50rem", "44rem", 8))
        self.assertFalse(apply_tolerance("53rem", "44rem", 8))

    def test_em_within_tolerance(self):
        self.assertTrue(apply_tolerance("0.28em", "0.28em", 0.05))
        self.assertTrue(apply_tolerance("0.32em", "0.28em", 0.05))
        self.assertFalse(apply_tolerance("0.40em", "0.28em", 0.05))

    def test_mixed_units_compare_numeric_part(self):
        self.assertTrue(apply_tolerance("44px", "44rem", 0))


class BuildPagesTests(unittest.TestCase):
    def test_default_production_urls(self):
        pages = build_pages("https://pizdato.net", "chto-znachit-pizdato")
        self.assertEqual(pages["home"]["url"], "https://pizdato.net/")
        self.assertEqual(pages["feed"]["url"], "https://pizdato.net/lenta")
        self.assertEqual(
            pages["article"]["url"],
            "https://pizdato.net/articles/chto-znachit-pizdato",
        )

    def test_custom_base_and_article_slug(self):
        pages = build_pages("http://127.0.0.1:4173/", "my-slug")
        self.assertEqual(pages["home"]["url"], "http://127.0.0.1:4173/")
        self.assertEqual(pages["feed"]["url"], "http://127.0.0.1:4173/lenta")
        self.assertEqual(
            pages["article"]["url"],
            "http://127.0.0.1:4173/articles/my-slug",
        )


class NormalizeCssColorTests(unittest.TestCase):
    def test_hex_becomes_rgb(self):
        self.assertEqual(normalize_css_color("#3DFF9A"), "rgb(61, 255, 154)")

    def test_short_hex(self):
        self.assertEqual(normalize_css_color("#0C0"), "rgb(0, 204, 0)")

    def test_rgb_spacing_normalized(self):
        self.assertEqual(
            normalize_css_color("rgb(61,255,154)"),
            "rgb(61, 255, 154)",
        )


class CssValuesMatchTests(unittest.TestCase):
    def test_hex_matches_computed_rgb(self):
        self.assertTrue(css_values_match("rgb(61, 255, 154)", "#3DFF9A"))

    def test_linear_gradient_pattern(self):
        actual = "linear-gradient(90deg, rgb(15, 143, 82), rgb(61, 255, 154))"
        self.assertTrue(css_values_match(actual, "linear-gradient(...)"))
        self.assertFalse(css_values_match("none", "linear-gradient(...)"))

    def test_exact_non_color(self):
        self.assertTrue(css_values_match("column", "column"))
        self.assertFalse(css_values_match("row", "column"))


class ParseArgsTests(unittest.TestCase):
    def test_defaults_target_production(self):
        args = parse_args([])
        self.assertEqual(args.base_url, "https://pizdato.net")
        self.assertEqual(args.article_slug, "chto-znachit-pizdato")
        self.assertIsNone(args.page)

    def test_custom_base_url_and_article(self):
        args = parse_args(
            [
                "--base-url",
                "http://127.0.0.1:4173",
                "--article-slug",
                "my-slug",
                "--page",
                "home",
            ]
        )
        self.assertEqual(args.base_url, "http://127.0.0.1:4173")
        self.assertEqual(args.article_slug, "my-slug")
        self.assertEqual(args.page, "home")


def _mock_page(css_actual="flex", count=1):
    page = MagicMock()
    loc = MagicMock()
    loc.count.return_value = count
    loc.first = loc
    loc.is_visible.return_value = True
    loc.evaluate.return_value = css_actual
    page.locator.return_value = loc
    return page


class RunValidationTests(unittest.TestCase):
    _checks = [
        {
            "selector": ".hero",
            "props": [{"property": "display", "token": "flex", "desc": "hero"}],
        }
    ]
    _page_config = {"url": "http://127.0.0.1:4173/", "checks": "home-checks.json"}

    def test_reuses_injected_browser_and_does_not_close_it(self):
        browser = MagicMock()
        page = _mock_page()
        browser.new_page.return_value = page

        run_validation(
            "home", self._page_config, {}, self._checks, {"width": 1280, "height": 800}, browser
        )

        browser.new_page.assert_called_once()
        browser.close.assert_not_called()
        page.close.assert_called()

    def test_waits_for_first_selector(self):
        browser = MagicMock()
        page = _mock_page()
        browser.new_page.return_value = page

        run_validation(
            "home", self._page_config, {}, self._checks, {"width": 1280, "height": 800}, browser
        )

        page.wait_for_selector.assert_called_with(".hero", timeout=15000)

    def test_goto_error_is_graceful_failure(self):
        browser = MagicMock()
        page = _mock_page()
        page.goto.side_effect = RuntimeError("net::ERR_CONNECTION_REFUSED")
        browser.new_page.return_value = page

        total, passed, failures, report = run_validation(
            "home", self._page_config, {}, self._checks, {"width": 1280, "height": 800}, browser
        )

        self.assertGreaterEqual(failures, 1)
        self.assertEqual(passed, 0)
        self.assertTrue(any(not row["ok"] for row in report))
        self.assertTrue(any("<ERROR" in str(row["actual"]) for row in report))

    def test_locator_count_error_is_graceful_failure(self):
        browser = MagicMock()
        page = _mock_page()
        page.locator.side_effect = RuntimeError("execution context destroyed")
        browser.new_page.return_value = page

        total, passed, failures, report = run_validation(
            "home", self._page_config, {}, self._checks, {"width": 1280, "height": 800}, browser
        )

        self.assertGreaterEqual(failures, 1)
        self.assertTrue(any(not row["ok"] for row in report))


if __name__ == "__main__":
    unittest.main()
