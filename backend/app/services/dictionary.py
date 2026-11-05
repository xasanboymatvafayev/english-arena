"""Real dictionary integration.

Primary lexical data: freedictionaryapi.com (Wiktionary, CC BY-SA 4.0).
Uzbek translation: MyMemory (en→uz).
Audio: dictionaryapi.dev pronunciation files when available; the UI falls back
to the browser speech synthesis engine if no audio file exists.
"""

import html
from typing import Any

import httpx

DICTIONARY_API = "https://freedictionaryapi.com/api/v1/entries/en/{word}"
AUDIO_API = "https://api.dictionaryapi.dev/api/v2/entries/en/{word}"
TRANSLATE_API = "https://api.mymemory.translated.net/get"
GOOGLE_TRANSLATE_API = "https://translate.googleapis.com/translate_a/single"
CACHE_VERSION = 3


class WordNotFound(Exception):
    pass


class DictionaryUnavailable(Exception):
    pass


def _google_translate(text: str, timeout: float = 8) -> str | None:
    """Free fallback used when MyMemory is unavailable from the host."""
    try:
        response = httpx.get(
            GOOGLE_TRANSLATE_API,
            params={"client": "gtx", "sl": "en", "tl": "uz", "dt": "t", "q": text},
            timeout=timeout,
            headers={"User-Agent": "Mozilla/5.0 (compatible; EnglishArena/1.0)"},
        )
        response.raise_for_status()
        data = response.json()
    except (httpx.HTTPError, ValueError):
        return None
    try:
        chunks = [part[0] for part in data[0] if part and part[0]]
    except (TypeError, IndexError, KeyError):
        return None
    translated = html.unescape("".join(chunks).strip())
    if not translated or translated.lower() == text.lower():
        return None
    return translated


def _translate(text: str, timeout: float = 10) -> tuple[str | None, list[str], str | None]:
    if not text:
        return None, [], None

    # 1) MyMemory — official free translation API.
    try:
        response = httpx.get(
            TRANSLATE_API,
            params={"q": text, "langpair": "en|uz"},
            timeout=timeout,
            headers={"User-Agent": "EnglishArena/1.0"},
        )
        response.raise_for_status()
        data = response.json()
        if data.get("responseStatus") == 200:
            payload = data.get("responseData") or {}
            translated = html.unescape((payload.get("translatedText") or "").strip())
            if (
                translated
                and translated.lower() != text.lower()
                and "MYMEMORY WARNING" not in translated.upper()
                and "QUERY LENGTH LIMIT" not in translated.upper()
            ):
                alternatives: list[str] = []
                for match in (data.get("matches") or [])[:6]:
                    candidate = html.unescape((match.get("translation") or "").strip())
                    if (
                        candidate
                        and candidate.lower() != translated.lower()
                        and candidate not in alternatives
                        and "MYMEMORY" not in candidate.upper()
                    ):
                        alternatives.append(candidate)
                return translated, alternatives[:4], "MyMemory"
    except (httpx.HTTPError, ValueError):
        pass

    # 2) Google Translate public endpoint — fallback for hosts where MyMemory
    # is rate-limited or blocked (e.g. some cloud IP ranges).
    fallback = _google_translate(text)
    if fallback:
        return fallback, [], "Google Translate (fallback)"
    return None, [], None


def _audio_url(word: str) -> str | None:
    try:
        response = httpx.get(
            AUDIO_API.format(word=word),
            timeout=4,
            headers={"User-Agent": "EnglishArena/1.0"},
        )
        if response.status_code != 200:
            return None
        entries = response.json()
        for entry in entries:
            for item in entry.get("phonetics") or []:
                if item.get("audio"):
                    return item["audio"]
    except (httpx.HTTPError, ValueError):
        return None
    return None


def fetch_word(word: str) -> dict[str, Any]:
    try:
        response = httpx.get(
            DICTIONARY_API.format(word=word),
            timeout=12,
            headers={"User-Agent": "EnglishArena/1.0"},
        )
    except httpx.HTTPError as exc:
        raise DictionaryUnavailable(str(exc))

    if response.status_code == 429:
        raise DictionaryUnavailable("rate limit")
    if response.status_code >= 500:
        raise DictionaryUnavailable(f"Dictionary API {response.status_code}")
    if response.status_code >= 400:
        raise DictionaryUnavailable(f"Dictionary API {response.status_code}")

    try:
        data = response.json()
    except ValueError:
        raise DictionaryUnavailable("Dictionary API noto'g'ri javob qaytardi")

    entries = data.get("entries") or []
    if not entries:
        raise WordNotFound(word)

    entry = max(entries, key=lambda e: len(e.get("senses") or []))
    senses = entry.get("senses") or []
    if not senses:
        raise WordNotFound(word)

    phonetic = None
    for pronunciation in entry.get("pronunciations") or []:
        if pronunciation.get("text"):
            phonetic = pronunciation["text"]
            break

    definition = None
    example = None
    for sense in senses:
        if definition is None and sense.get("definition"):
            definition = sense["definition"].strip()
        if example is None and sense.get("examples"):
            example = sense["examples"][0].strip()
        if definition and example:
            break
    if definition is None:
        raise WordNotFound(word)

    synonyms: list[str] = []
    for candidate in entry.get("synonyms") or []:
        if candidate not in synonyms:
            synonyms.append(candidate)
    for sense in senses:
        for candidate in sense.get("synonyms") or []:
            if candidate not in synonyms:
                synonyms.append(candidate)

    translation, alternatives, translation_source = _translate(word)
    example_translation = None
    if example:
        example_translation, _, _ = _translate(example)

    warnings: list[str] = []
    if translation is None:
        warnings.append(
            "O'zbekcha tarjima xizmati hozir javob bermadi. Inglizcha izohdan foydalaning."
        )

    return {
        "cache_version": CACHE_VERSION,
        "word": (data.get("word") or word).strip(),
        "translation": translation,
        "translation_alternatives": alternatives,
        "phonetic": phonetic,
        "audio_url": _audio_url(word),
        "part_of_speech": entry.get("partOfSpeech"),
        "definition": definition,
        "example": example,
        "example_translation": example_translation,
        "synonyms": synonyms[:8],
        "source": "freedictionaryapi.com (Wiktionary, CC BY-SA 4.0) + "
        + (translation_source or "tarjima xizmati"),
        "warnings": warnings,
    }
