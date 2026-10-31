"""Turns medical jargon into everyday words, using the glossary in data/glossary.json.

This swaps known terms word for word and leaves the rest of the text as it is. It doesn't
rewrite sentences. Add entries to the glossary to cover more jargon.
"""

import json
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

GLOSSARY_PATH = Path(__file__).parent / "data" / "glossary.json"


@dataclass
class Replacement:
    term: str  # as it first appeared in the text
    plain: str
    count: int


def _phrase_pattern(term: str) -> str:
    # Let multi-word terms match across any whitespace, including line breaks.
    return r"\s+".join(re.escape(word) for word in term.split())


def _normalize(text: str) -> str:
    return " ".join(text.split())


class Simplifier:
    def __init__(self, entries: list[dict]) -> None:
        self._exact: dict[str, str] = {}  # case-sensitive terms, e.g. "BID" but not "bid"
        self._folded: dict[str, str] = {}  # everything else, keyed by lowercase term
        alternatives = []
        for entry in entries:
            term, plain = entry["term"], entry["plain"]
            if entry.get("case_sensitive"):
                self._exact[term] = plain
                alternatives.append((term, _phrase_pattern(term)))
            else:
                self._folded[term.lower()] = plain
                alternatives.append((term, f"(?i:{_phrase_pattern(term)})"))
        # Longest first, so "cardiac arrest" wins over "cardiac".
        alternatives.sort(key=lambda alt: len(alt[0]), reverse=True)
        terms = "|".join(pattern for _, pattern in alternatives)
        # An "a"/"an" right before a term is captured so it can be fixed to suit the new words.
        self._pattern = re.compile(
            rf"(?<![\w-])(?:(?P<article>[Aa]n?)(?P<space>\s+))?(?P<term>{terms})(?![\w-])"
        )

    def simplify(self, text: str) -> tuple[str, list[Replacement]]:
        """Return the simplified text and the terms that were replaced, in order of appearance."""
        found: dict[str, Replacement] = {}

        def replace(match: re.Match) -> str:
            original = _normalize(match["term"])
            if original in self._exact:
                key, plain = original, self._exact[original]
            else:
                key = original.lower()
                plain = self._folded[key]
                if original.isupper() and len(original) > 1:
                    plain = plain.upper()
                elif original[0].isupper():
                    plain = plain[0].upper() + plain[1:]

            if key in found:
                found[key].count += 1
            else:
                found[key] = Replacement(term=original, plain=plain, count=1)

            article = match["article"]
            if not article:
                return plain
            fixed = "an" if plain[0].lower() in "aeiou" else "a"
            if article[0] == "A":
                fixed = fixed.capitalize()
            return f"{fixed}{match['space']}{plain}"

        return self._pattern.sub(replace, text), list(found.values())


@lru_cache
def default_simplifier() -> Simplifier:
    return Simplifier(json.loads(GLOSSARY_PATH.read_text()))
