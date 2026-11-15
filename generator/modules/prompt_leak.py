"""Guard against prompt-template text leaking into published titles / meta / bodies.

The boost/optimize agents are given JSON templates such as
  {"meta_title": "<=60 chars, starts with focus keyword"}
and weaker fallback models sometimes copy the instruction instead of filling it in
(live examples: "Bahrain Day Trips … <=60 chars", body lines like "The focus keyword
appears in the first sentence"). Everything that writes a title or body runs through here.
"""
import re

TITLE_MAX = 70

# Instruction fragments that never belong in a real headline.
_BAD_TITLE = re.compile(
    r"(\bchars?\b|\bcharacters\b|focus keyword|<=|>=|starts with (the )?(focus )?keyword|"
    r"meta (title|description)|\bno filler\b|specific number)", re.I)


def bad_title(t: str, max_len: int = TITLE_MAX) -> str:
    """Reason the title is unusable, or '' when it is fine."""
    t = (t or "").strip()
    if not t:
        return "empty"
    m = _BAD_TITLE.search(t)
    if m:
        return f"prompt text '{m.group(0)}'"
    if len(t) > max_len:
        return f"too long ({len(t)} > {max_len})"
    return ""


def bad_description(d: str) -> str:
    d = (d or "").strip()
    m = re.search(r"(focus keyword|\b\d+\s*-\s*\d+\s*chars\b|<=\s*\d+|complete sentences ending)", d, re.I)
    return f"prompt text '{m.group(0)}'" if m else ""


# A sentence is an instruction (not reader content) when it talks about the focus keyword,
# or about the meta description / on-page checks together with SEO-mechanics words.
_FOCUS = re.compile(r"focus[\s-]keyword", re.I)
_SEO_TOPIC = re.compile(r"(meta[\s-]description|meta[\s-]title|on-page( seo)?( check)?s?\b)", re.I)
_SEO_MECH = re.compile(r"(\bkeyword\b|\bchars?\b|characters|rank ?math|seo (check|score)|first (sentence|paragraph)|"
                       r"\bh2\b|\bh3\b|subheading|this (article|post|section)|we (have |)(included|added|used))", re.I)


def _is_instruction(sentence: str) -> bool:
    s = re.sub(r"<[^>]+>", " ", sentence)
    if _FOCUS.search(s):
        return True
    return bool(_SEO_TOPIC.search(s) and _SEO_MECH.search(s))


def clean_body(html: str) -> tuple[str, int]:
    """Remove instruction sentences from an HTML body. Returns (html, sentences_removed).
    Works per text block (<p>, <li>, <td>, headings): sentences are dropped inside the block,
    and a block left empty is removed entirely."""
    if not html:
        return html, 0
    removed = 0

    def fix_block(m):
        nonlocal removed
        open_tag, inner, close_tag = m.group(1), m.group(3), m.group(4)
        if not _is_instruction(inner):
            return m.group(0)
        # split on sentence ends that are outside tags
        parts = re.split(r"(?<=[.!?।])\s+(?=[A-Z<\"'(ঀ-৿0-9])", inner)
        keep = []
        for p in parts:
            if _is_instruction(p):
                removed += 1
            else:
                keep.append(p)
        new = " ".join(keep).strip()
        if not re.sub(r"<[^>]+>|&nbsp;|\s", "", new):
            return ""
        return f"{open_tag}{new}{close_tag}"

    out = re.sub(r"(<(p|li|td|h[2-6]|blockquote)\b[^>]*>)(.*?)(</\2>)",
                 fix_block, html, flags=re.S | re.I)
    return out, removed


def first_heading(html: str) -> str:
    m = re.search(r"<h[12][^>]*>(.*?)</h[12]>", html or "", re.S | re.I)
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.group(1))).strip() if m else ""


def shorten_title(t: str, max_len: int = TITLE_MAX) -> str:
    """Trim a long headline at a natural break (':' / '—' / '|' / ','), else at a word boundary."""
    t = re.sub(r"\s+", " ", (t or "")).strip()
    if len(t) <= max_len:
        return t
    for sep in (" | ", " — ", " – ", ": ", ", "):
        head = t
        while len(head) > max_len and sep in head:
            head = head.rsplit(sep, 1)[0]
        if 25 <= len(head) <= max_len:
            return head.strip(" ,:;-–—|")
    cut = t[:max_len].rsplit(" ", 1)[0]
    return cut.strip(" ,:;-–—|&")


def strip_title_instructions(t: str) -> str:
    """Drop an instruction tail like ' <=60 chars, starts with focus keyword'."""
    t = re.split(r"\s*(?:[-–—|(,]\s*)?(?:<=|>=)\s*\d+\s*chars?.*$", t or "", flags=re.I)[0]
    t = re.sub(r"\s*[,(]?\s*starts with (the )?(focus )?keyword.*$", "", t, flags=re.I)
    return t.strip(" ,:;-–—|(")
