# OilyRAG

OilyRAG is a command-line RAG chatbot for workshop manuals and service documents.

It is designed for:

- Technical Q and A over local files
- Ongoing multi-turn chat in the terminal
- Scanned PDFs that require OCR
- Diagram-aware extraction using a local vision model

The current implementation is a local CLI tool. The project is intended to evolve into an API service that accepts POST requests.

## Current capabilities

- Chatbot loop with conversation memory per session
- One-shot question mode
- TXT and PDF ingestion
- OCR fallback for scanned or text-light PDFs
- Optional vision summaries for PDF pages and diagrams
- Retrieval-augmented answers using LangChain and in-memory vector search

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Ensure Ollama is installed and running.

3. Pull base models:

```bash
ollama pull llama3
ollama pull nomic-embed-text
```

4. Run interactive chat:

```bash
node index.js --document="./materials/mini-manual.txt"
```

5. Exit chat with `exit` or `quit`.

## CLI usage

```bash
node index.js [options]
```

Options:

- `--query` initial question before entering chat mode
- `--once` answer a single question and exit (requires `--query`)
- `--document` source document path
- `--model` Ollama chat model (default: `llama3`)
- `--embeddingModel` Ollama embeddings model (default: `nomic-embed-text:latest`)
- `--chunkSize` text split chunk size (default: `1000`)
- `--chunkOverlap` text split chunk overlap (default: `100`)
- `--searchType` retriever search strategy (default: `similarity`)
- `--kDocuments` number of retrieved chunks (default: `5`)

OCR options:

- `--ocrMode` `auto | always | off` (default: `auto`)
- `--ocrLanguage` OCR language code (default: `eng`)
- `--ocrMinChars` in `auto`, OCR runs when extracted text is below this value (default: `250`)

Vision options:

- `--visionMode` `off | auto | always` (default: `off`)
- `--visionModel` Ollama vision model (default: `llava:latest`)
- `--visionMaxPages` max PDF pages to analyze with vision (default: `8`)
- `--visionMinChars` in `auto`, vision runs when extracted text is below this value (default: `250`)

## Dependencies

Core:

- Node.js 20+
- Ollama

OCR:

- `ocrmypdf`
- `tesseract`

Vision:

- `pdftoppm` (from poppler-utils)
- An installed Ollama vision model (for example `llava:latest`)

Example install commands on Debian/Ubuntu:

```bash
sudo apt install ocrmypdf tesseract-ocr poppler-utils
```

## Examples

Interactive chat with PDF:

```bash
node index.js --document="./materials/manual.pdf"
```

One-shot answer:

```bash
node index.js --once --query="What is the ideal tire pressure?" --document="./materials/manual.pdf"
```

Force OCR for scanned pages:

```bash
node index.js --document="./materials/scanned-manual.pdf" --ocrMode=always
```

Enable vision for diagrams:

```bash
node index.js --document="./materials/scanned-manual.pdf" --visionMode=always --visionModel="llava:latest"
```

## Roadmap

- Stabilize ingestion and retrieval quality for mixed text/scan manuals
- Add persistent vector storage and optional caching
- Expose the chatbot as a POST-based HTTP API
- Add authentication, rate limits, and request tracing
- Package for container deployment

See spec.md for planned API and architecture details.
