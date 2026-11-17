"""New slugs are cut on a hyphen, never mid-word. Published slugs are not renamed here."""
import unittest

from modules.seo import english_slug_from_model, make_slug, trim_slug


class SlugBoundary(unittest.TestCase):
    def test_trim_keeps_whole_words(self):
        long = "-".join(["word"] * 30)
        out = trim_slug(long, 70)
        self.assertLessEqual(len(out), 70)
        self.assertTrue(out.endswith("word"))
        self.assertFalse(out.endswith("-"))
        self.assertTrue(long.startswith(out + "-") or long == out)

    def test_model_slug_does_not_end_mid_word(self):
        raw = "Qatar work visa salary rules and migration services for Bangladeshi workers extra words"
        out = english_slug_from_model(raw)
        self.assertLessEqual(len(out), 70)
        self.assertIn(out.split("-")[-1], raw.lower().split())
        self.assertFalse(out.endswith("servic"))

    def test_make_slug_word_boundary(self):
        title = "US citizens working in Europe 2026 visa rules and migration services overview for skilled workers today"
        out = make_slug(title, "abc")
        self.assertLessEqual(len(out), 70)
        self.assertRegex(out, r"^[a-z0-9]+(-[a-z0-9]+)*$")
        self.assertFalse(out.endswith("servic"))
        self.assertFalse(out.endswith("tota"))


if __name__ == "__main__":
    unittest.main()
