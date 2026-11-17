"""Verify the real live-policy migration against SQLite before changing D1."""
import sqlite3
import unittest
from pathlib import Path

class PublishingPolicy(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.executescript("CREATE TABLE articles(site_id TEXT,slug TEXT); CREATE TABLE seo_state(key TEXT PRIMARY KEY,value TEXT);")
        self.db.executescript((Path(__file__).resolve().parents[1] / "seo-engine/infkey-policy.sql").read_text(encoding="utf-8"))

    def test_generic_infkey_insert_is_blocked(self):
        with self.assertRaisesRegex(sqlite3.IntegrityError, "paused"):
            self.db.execute("INSERT INTO articles VALUES('infkey','generic-ai-guide')")

    def test_other_sites_are_unaffected(self):
        for site in ["countly", "ninetymins", "walvi", "gccguide"]:
            self.db.execute("INSERT INTO articles VALUES(?,'existing-pipeline')", [site])
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM articles").fetchone()[0], 4)

    def test_explicit_reviewed_article_can_be_allowed(self):
        self.db.execute("INSERT INTO seo_state VALUES('approved-article:infkey:sourced-table','true')")
        self.db.execute("INSERT INTO articles VALUES('infkey','sourced-table')")
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM articles").fetchone()[0], 1)

if __name__ == "__main__":
    unittest.main()
