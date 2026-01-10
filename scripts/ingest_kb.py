import argparse
import json
import os
import re
import time
import urllib.request
from typing import List, Dict, Any, Tuple

from pypdf import PdfReader


DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small"
DEFAULT_CHUNK_CHARS = 1800
DEFAULT_OVERLAP_CHARS = 200
DEFAULT_BATCH_SIZE = 20


def normalize_text(text: str) -> str:
    text = text.replace("\u2022", "-").replace("\u25cf", "-")
    text = re.sub(r"[\t\r\f\v]+", " ", text)
    text = re.sub(r" +", " ", text)
    text = re.sub(r"\n+", "\n", text)
    return text.strip()


def extract_pages(pdf_path: str) -> List[Tuple[int, str]]:
    reader = PdfReader(pdf_path, strict=False)
    pages = []
    for i, page in enumerate(reader.pages, start=1):
        try:
            text = page.extract_text() or ""
        except Exception:
            try:
                text = page.extract_text(extraction_mode="layout") or ""
            except Exception:
                text = ""
        pages.append((i, normalize_text(text)))
    return pages


def is_heading(line: str) -> bool:
    return re.match(r"^\d+(\.\d+)*\s+", line) is not None


def chunk_pages(pages: List[Tuple[int, str]], max_chars: int, overlap_chars: int) -> List[Dict[str, Any]]:
    chunks: List[Dict[str, Any]] = []
    buffer = ""
    current_section = None
    buffer_end_page = None
    chunk_index = 0

    for page_num, page_text in pages:
        for line in page_text.splitlines():
            line = line.strip()
            if not line:
                continue
            if is_heading(line):
                current_section = line
            candidate = buffer + ("\n" if buffer else "") + line
            if len(candidate) > max_chars:
                chunk_text = buffer.strip()
                if chunk_text:
                    chunks.append({
                        "chunk_index": chunk_index,
                        "section": current_section,
                        "page": buffer_end_page or page_num,
                        "content": chunk_text,
                        "token_count": len(chunk_text.split()),
                    })
                    chunk_index += 1
                    buffer = chunk_text[-overlap_chars:] if overlap_chars > 0 else ""
                    if not buffer:
                        buffer_end_page = None
                candidate = buffer + ("\n" if buffer else "") + line
            buffer = candidate
            buffer_end_page = page_num

    if buffer.strip():
        chunks.append({
            "chunk_index": chunk_index,
            "section": current_section,
            "page": buffer_end_page,
            "content": buffer.strip(),
            "token_count": len(buffer.split()),
        })

    return chunks


def request_json(url: str, method: str, headers: Dict[str, str], payload: Any) -> Any:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        body = resp.read().decode("utf-8")
        return json.loads(body) if body else None


def create_kb_version(base_url: str, api_key: str, version_label: str, storage_path: str, notes: str, is_active: bool) -> Dict[str, Any]:
    headers = {
        "Content-Type": "application/json",
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Prefer": "return=representation",
    }

    if is_active:
        request_json(
            f"{base_url}/rest/v1/kb_versions?is_active=eq.true",
            "PATCH",
            headers,
            {"is_active": False},
        )

    payload = {
        "version_label": version_label,
        "storage_path": storage_path,
        "notes": notes,
        "is_active": is_active,
    }
    response = request_json(f"{base_url}/rest/v1/kb_versions", "POST", headers, [payload])
    return response[0]


def insert_chunks(base_url: str, api_key: str, version_id: str, chunks: List[Dict[str, Any]], embeddings: List[List[float]]) -> None:
    headers = {
        "Content-Type": "application/json",
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
    }
    payload = []
    for chunk, embedding in zip(chunks, embeddings):
        payload.append({
            "version_id": version_id,
            "chunk_index": chunk["chunk_index"],
            "section": chunk["section"],
            "page": chunk["page"],
            "content": chunk["content"],
            "token_count": chunk["token_count"],
            "embedding": embedding,
        })
    request_json(f"{base_url}/rest/v1/kynare_kb_chunks", "POST", headers, payload)


def embed_texts(api_key: str, model: str, texts: List[str]) -> List[List[float]]:
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    payload = {"model": model, "input": texts}
    response = request_json("https://api.openai.com/v1/embeddings", "POST", headers, payload)
    return [item["embedding"] for item in response["data"]]


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest Kynare knowledge base into Supabase.")
    parser.add_argument("--pdf", required=True, help="Path to the PDF file.")
    parser.add_argument("--storage-path", required=True, help="Supabase Storage path for the PDF.")
    parser.add_argument("--version-label", required=True, help="KB version label (e.g., v1-2024-09).")
    parser.add_argument("--notes", default="", help="Optional version notes.")
    parser.add_argument("--set-active", action="store_true", help="Mark this version as active.")
    parser.add_argument("--chunk-chars", type=int, default=DEFAULT_CHUNK_CHARS)
    parser.add_argument("--overlap-chars", type=int, default=DEFAULT_OVERLAP_CHARS)
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    parser.add_argument("--embedding-model", default=DEFAULT_EMBEDDING_MODEL)
    args = parser.parse_args()

    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")

    if not supabase_url or not service_key or not openai_key:
        raise SystemExit("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or OPENAI_API_KEY.")

    base_url = supabase_url.rstrip("/")

    pages = extract_pages(args.pdf)
    chunks = chunk_pages(pages, args.chunk_chars, args.overlap_chars)
    if not chunks:
        raise SystemExit("No chunks created from the PDF.")

    version = create_kb_version(
        base_url=base_url,
        api_key=service_key,
        version_label=args.version_label,
        storage_path=args.storage_path,
        notes=args.notes,
        is_active=args.set_active,
    )

    version_id = version["id"]
    total = len(chunks)
    print(f"Created KB version {version_id}. Inserting {total} chunks...")

    for i in range(0, total, args.batch_size):
        batch = chunks[i:i + args.batch_size]
        embeddings = embed_texts(openai_key, args.embedding_model, [c["content"] for c in batch])
        insert_chunks(base_url, service_key, version_id, batch, embeddings)
        print(f"Inserted chunks {i + 1}-{min(i + args.batch_size, total)}")
        time.sleep(0.2)

    print("Ingestion complete.")


if __name__ == "__main__":
    main()
