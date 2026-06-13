"""Build the Redis knowledge-base index from kb/documents at startup.

Ported from the template's cs_agent/ingest.py. Divergence: if Redis is
unreachable (e.g. local dev without Docker) the build logs a warning and returns
instead of raising, so the agent still serves (RAG disabled, scoring still works).
Embeddings load from the pre-baked cache (kb/embeddings.json) when present, else
live-embed; without model credentials the index is BM25-only.
"""

import base64
import json
import struct
import sys

import redis
from redis.commands.search.field import TextField, VectorField
from redis.commands.search.index_definition import IndexDefinition, IndexType

from rag_tools import (
    DOC_PREFIX,
    EMBEDDING_DIM,
    KB_DOCUMENTS_DIR,
    KB_EMBEDDINGS_PATH,
    KB_INDEX,
    REDIS_URL,
    _embed,
)

EMBED_BATCH_SIZE = 25


def load_embedding_cache() -> dict[str, bytes]:
    if not KB_EMBEDDINGS_PATH.exists():
        return {}
    raw = json.loads(KB_EMBEDDINGS_PATH.read_text())
    return {doc_id: base64.b64decode(b64) for doc_id, b64 in raw.items()}


def load_documents() -> list[dict]:
    docs = []
    for path in sorted(KB_DOCUMENTS_DIR.glob("*.json")):
        docs.append(json.loads(path.read_text(encoding="utf-8")))
    return docs


def build_index() -> None:
    """(Re)create the KB index and load every document, embedding if possible."""
    documents = load_documents()
    if not documents:
        print(f"[ingest] no KB documents in {KB_DOCUMENTS_DIR}; RAG disabled", file=sys.stderr)
        return

    client = redis.Redis.from_url(REDIS_URL, decode_responses=False)
    try:
        client.ping()
    except Exception as exc:  # local dev without Redis: degrade, don't crash
        print(f"[ingest] Redis unavailable ({type(exc).__name__}) at {REDIS_URL}; "
              "RAG disabled (assess_priority + Linkup still work)", file=sys.stderr)
        return

    try:
        client.ft(KB_INDEX).dropindex(delete_documents=True)
    except redis.ResponseError:
        pass

    client.ft(KB_INDEX).create_index(
        fields=[
            TextField("title", weight=2.0),
            TextField("content"),
            VectorField("embedding", "HNSW",
                        {"TYPE": "FLOAT32", "DIM": EMBEDDING_DIM, "DISTANCE_METRIC": "COSINE"}),
        ],
        definition=IndexDefinition(prefix=[DOC_PREFIX], index_type=IndexType.HASH),
    )

    cache = load_embedding_cache()
    embedding_bytes: list[bytes | None] = [cache.get(d["id"]) for d in documents]
    misses = [i for i, b in enumerate(embedding_bytes) if b is None]
    if cache:
        print(f"[ingest] embedding cache hit for {len(documents) - len(misses)}/{len(documents)}",
              file=sys.stderr)
    if misses:
        try:
            for start in range(0, len(misses), EMBED_BATCH_SIZE):
                idx = misses[start:start + EMBED_BATCH_SIZE]
                vectors = _embed([f"{documents[i]['title']}\n{documents[i]['content']}" for i in idx])
                for i, vector in zip(idx, vectors):
                    embedding_bytes[i] = struct.pack(f"{EMBEDDING_DIM}f", *vector)
            print(f"[ingest] live-embedded {len(misses)} uncached documents", file=sys.stderr)
        except Exception as exc:
            print(f"[ingest] embeddings unavailable ({exc}); {len(misses)} doc(s) BM25-only",
                  file=sys.stderr)

    pipe = client.pipeline(transaction=False)
    for doc, emb in zip(documents, embedding_bytes):
        mapping = {"title": doc["title"], "content": doc["content"]}
        if emb is not None:
            mapping["embedding"] = emb
        pipe.hset(f"{DOC_PREFIX}{doc['id']}", mapping=mapping)
    pipe.execute()
    print(f"[ingest] indexed {len(documents)} documents into {KB_INDEX}", file=sys.stderr)


if __name__ == "__main__":
    build_index()
