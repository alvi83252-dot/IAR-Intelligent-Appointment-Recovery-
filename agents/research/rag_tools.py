"""Knowledge-base search tools backed by Redis (RediSearch).

Ported from the a2a-hackathon template's cs_agent/rag_tools.py, adapted for IAR:
KB paths + REDIS_URL resolve via env/repo layout, and both searches degrade to a
readable error entry (never raise) if Redis or embeddings are unavailable, so the
research agent keeps serving on assess_priority + Linkup alone.
"""

import os
import re
import struct
from pathlib import Path

import redis

from common.config import REDIS_URL

# KB layout: env KB_DIR wins (docker sets /app/kb); else repo-root kb/ for local.
KB_DIR = Path(os.environ.get("KB_DIR") or (Path(__file__).resolve().parents[2] / "kb"))
KB_DOCUMENTS_DIR = KB_DIR / "documents"
KB_POLICY_PATH = KB_DIR / "policy.md"
KB_EMBEDDINGS_PATH = KB_DIR / "embeddings.json"

KB_INDEX = "kb_idx"
DOC_PREFIX = "doc:"
EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIM = 768

_client = redis.Redis.from_url(REDIS_URL, decode_responses=False)
_genai_client = None


def _get_genai_client():
    global _genai_client
    if _genai_client is None:
        from google import genai

        _genai_client = genai.Client()
    return _genai_client


def _embed(texts: list[str]) -> list[list[float]]:
    """Embed texts with gemini-embedding-001 via google-genai."""
    from google.genai import types

    result = _get_genai_client().models.embed_content(
        model=EMBEDDING_MODEL,
        contents=texts,
        config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIM),
    )
    return [e.values for e in result.embeddings]


def _decode(value) -> str:
    return value.decode() if isinstance(value, bytes) else str(value)


def _parse_search_reply(reply) -> list[dict]:
    """Normalize an FT.SEARCH reply (array or Redis 8 map shape) to result dicts."""
    if isinstance(reply, dict):
        results = reply.get(b"results", reply.get("results")) or []
        out = []
        for row in results:
            attrs = row.get(b"extra_attributes", row.get("extra_attributes")) or {}
            doc = {"doc_id": _decode(row.get(b"id", row.get("id", "")))}
            doc.update({_decode(k): _decode(v) for k, v in attrs.items()})
            out.append(doc)
        return out
    out = []
    for i in range(1, len(reply) - 1, 2):
        doc = {"doc_id": _decode(reply[i])}
        fields = reply[i + 1]
        for j in range(0, len(fields) - 1, 2):
            doc[_decode(fields[j])] = _decode(fields[j + 1])
        out.append(doc)
    return out


def _strip_score(docs: list[dict]) -> list[dict]:
    for doc in docs:
        doc.pop("score", None)
    return docs


def kb_search_bm25(query: str, top_k: int = 5) -> list[dict]:
    """Full-text (BM25) keyword search over the NHS services knowledge base.

    Args:
        query: Keywords or a short phrase. Matching is ranked, so extra keywords help.
        top_k: Number of documents to return.

    Returns:
        Matching documents with doc_id, title, and content (or an error entry).
    """
    terms = re.findall(r"\w+", query.lower())
    if not terms:
        return []
    or_query = "|".join(dict.fromkeys(terms))  # OR-join; RediSearch defaults to AND
    try:
        reply = _client.execute_command(
            "FT.SEARCH", KB_INDEX, or_query,
            "LIMIT", "0", str(top_k),
            "RETURN", "2", "title", "content",
        )
        return _parse_search_reply(reply)
    except Exception as exc:
        return [{"error": f"Knowledge base unavailable ({type(exc).__name__}). "
                          "Answer from general NHS signposting principles."}]


def kb_search_vector(query: str, top_k: int = 5) -> list[dict]:
    """Semantic (vector) search over the NHS services knowledge base.

    Better than kb_search_bm25 for natural-language questions. Falls back with an
    error entry (use kb_search_bm25) if embeddings or the index are unavailable.

    Args:
        query: A natural-language question or description.
        top_k: Number of documents to return.
    """
    try:
        vector = struct.pack(f"{EMBEDDING_DIM}f", *_embed([query])[0])
        reply = _client.execute_command(
            "FT.SEARCH", KB_INDEX, f"*=>[KNN {top_k} @embedding $vec AS score]",
            "PARAMS", "2", "vec", vector,
            "SORTBY", "score",
            "LIMIT", "0", str(top_k),
            "RETURN", "3", "title", "content", "score",
            "DIALECT", "2",
        )
        return _strip_score(_parse_search_reply(reply))
    except Exception as exc:
        return [{"error": f"Vector search unavailable ({type(exc).__name__}). "
                          "Use kb_search_bm25 with keywords instead."}]
