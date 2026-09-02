# OilyRAG Spec

## 1. Purpose

OilyRAG is a local-first retrieval-augmented chatbot for technical service documentation.

Current state:

- CLI-first
- Single-process runtime
- In-memory vector store
- Optional OCR and vision enrichment for scanned manuals

Target state:

- API-accessible service that accepts POST requests for chat and ingestion

## 2. Goals

- Answer domain-specific mechanical and service questions from local documents
- Support multi-turn chat with context
- Handle digital PDFs, scanned PDFs, and plain text files
- Enable diagram-aware retrieval through optional vision summaries
- Provide a migration path from local CLI to HTTP API

## 3. Non-goals (current phase)

- Multi-tenant user management
- Fine-grained RBAC
- Cloud-scale distributed indexing
- Guaranteed real-time streaming transport

## 4. Current system behavior (CLI)

Entry point:

- index.js

Primary flow:

1. Parse CLI args
2. Validate mode and numeric settings
3. Optional vision preflight (when enabled)
4. Load source document
5. For PDF input:
   - Extract text with PDF loader
   - Optional OCR depending on ocrMode and thresholds
   - Optional vision summaries depending on visionMode and thresholds
6. Split into chunks
7. Embed with Ollama embeddings
8. Build in-memory retriever
9. Serve one-shot answer or interactive chat loop

## 5. Functional requirements

### FR-1: Query modes

- Support one-shot mode for automation (`--once` + `--query`)
- Support interactive chat mode by default

### FR-2: Input formats

- TXT files
- PDF files with extractable text
- Scanned PDF files via OCR fallback

### FR-3: OCR behavior

- `ocrMode=off`: never OCR
- `ocrMode=auto`: OCR only if extracted text count is below threshold
- `ocrMode=always`: always OCR PDFs

### FR-4: Vision behavior

- `visionMode=off`: never run vision
- `visionMode=auto`: run vision on text-light documents
- `visionMode=always`: always run vision for PDF pages
- Include per-page vision summaries as retrievable context

### FR-5: Chat memory

- Maintain in-session chat history for follow-up questions
- Do not persist history across process restarts in current phase

### FR-6: Dependency checks

- Fail early with clear errors for missing required OCR/vision dependencies
- Fail early when selected vision model is not installed locally

## 6. Quality attributes

- Reliability: deterministic startup validation and clear failure modes
- Transparency: logs indicate when OCR/vision is applied
- Local privacy: all processing runs locally unless user adds remote components
- Extensibility: architecture allows replacing in-memory store with persistent store

## 7. Planned API surface (POST)

## 7.1 API baseline

- Protocol: HTTP/1.1 JSON
- Initial transport: local network or localhost
- Auth: none in prototype, token-based in next phase

## 7.2 Endpoint: chat query

POST /v1/chat/query

Request body:

```json
{
  "query": "What is the ideal tire pressure?",
  "sessionId": "optional-session-id",
  "document": "./materials/manual.pdf",
  "options": {
    "model": "llama3",
    "embeddingModel": "nomic-embed-text:latest",
    "ocrMode": "auto",
    "visionMode": "off",
    "kDocuments": 5
  }
}
```

Response body:

```json
{
  "answer": "...",
  "sessionId": "session-id",
  "meta": {
    "documentsUsed": 5,
    "ocrApplied": false,
    "visionApplied": false,
    "latencyMs": 1234
  }
}
```

## 7.3 Endpoint: ingest document

POST /v1/ingest

Request body:

```json
{
  "document": "./materials/manual.pdf",
  "options": {
    "ocrMode": "auto",
    "visionMode": "off"
  }
}
```

Response body:

```json
{
  "status": "ok",
  "documentId": "doc-123",
  "meta": {
    "chunks": 128,
    "ocrApplied": true,
    "visionPages": 8
  }
}
```

## 7.4 Endpoint: health

GET /health

Response body:

```json
{
  "status": "ok",
  "ollama": "reachable",
  "models": {
    "chat": "llama3",
    "embeddings": "nomic-embed-text:latest"
  }
}
```

## 8. Error model

- 400 for invalid user input (bad options, missing required fields)
- 409 for conflicting runtime state (already indexing same resource)
- 422 for unsupported document type
- 500 for internal errors
- 503 for unavailable dependencies (Ollama down, missing model, missing OCR tools)

Error body shape:

```json
{
  "error": {
    "code": "VISION_MODEL_MISSING",
    "message": "Vision model 'llava:latest' is not installed.",
    "hint": "Run: ollama pull llava:latest"
  }
}
```

## 9. Data and state

Current:

- Vectors live in process memory
- Chat history lives in process memory

Planned:

- Persistent vector index (for example Chroma or pgvector)
- Session store keyed by sessionId
- Optional index cache keyed by document hash

## 10. Security and safety

- Validate and sanitize document paths
- Restrict readable document roots for API mode
- Avoid returning raw stack traces in production API responses
- Add request size and page-count limits
- Add API token auth before exposing outside localhost

## 11. Observability

- Structured logs with request/session IDs
- Track OCR and vision usage flags
- Track latency for load, embed, retrieve, and answer stages
- Add health and readiness probes in API mode

## 12. Milestones

M1 CLI hardening (current):

- Chat loop, OCR, vision, preflight checks

M2 API prototype:

- POST /v1/chat/query
- POST /v1/ingest
- GET /health

M3 Persistence and scaling:

- Durable vector storage
- Session persistence
- Basic auth and rate limiting

M4 Production readiness:

- Container-first deployment
- Metrics and tracing
- Robust error taxonomy and SLOs
