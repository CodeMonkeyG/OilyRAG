import { Ollama, OllamaEmbeddings } from "@langchain/ollama";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import path from "node:path";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";

const execFileAsync = promisify(execFile);

class DocumentQA {

	constructor({ 
		model = "llama3",
		document,
		pdfDocument,
		embeddingModel = "nomic-embed-text:latest",
		chunkSize = 1000,
		chunkOverlap = 100,
		ocrMode = "auto",
		ocrLanguage = "eng",
		ocrMinChars = 250,
		visionMode = "off",
		visionModel = "llava:latest",
		visionMaxPages = 8,
		visionMinChars = 250,
		searchType = "similarity", 
		kDocuments = 5 
	}) {

		this.model          = model;
		this.document       = document || pdfDocument;
		this.embeddingModel = embeddingModel;
		this.chunkSize      = chunkSize;
		this.chunkOverlap   = chunkOverlap;
		this.ocrMode        = ocrMode;
		this.ocrLanguage    = ocrLanguage;
		this.ocrMinChars    = ocrMinChars;
		this.visionMode     = visionMode;
		this.visionModel    = visionModel;
		this.visionMaxPages = visionMaxPages;
		this.visionMinChars = visionMinChars;

		this.searchType     = searchType;
		this.kDocuments     = kDocuments;

	}

	async init(){
		this.initChatModel();
		await this.loadDocuments();
		await this.splitDocuments();
		this.selectEmbedding = new OllamaEmbeddings({ model: this.embeddingModel });
		await this.createVectorStore();
		this.createRetriever();
		this.chain = await this.createChain();
		return this;
	}

	initChatModel(){
		console.log("Loading model...");
		this.llm = new Ollama({ model: this.model });
	}

	async loadDocuments(){
		console.log(`Loading document: ${this.document}...`);
		const resolvedPath = path.isAbsolute(this.document)
			? this.document
			: path.join(import.meta.dirname, this.document);

		if (resolvedPath.endsWith(".pdf")) {
			this.documents = await this.loadPdfWithOptionalOcr(resolvedPath);
			this.documents = await this.appendVisionContextIfNeeded(this.documents, resolvedPath);
		} else {
			const textLoader = new TextLoader(resolvedPath);
			this.documents = await textLoader.load();
		}
	}

	async loadPdfWithOptionalOcr(pdfPath) {
		const directDocuments = await this.loadPdfDocuments(pdfPath);
		const extractedCharCount = this.getExtractedCharCount(directDocuments);

		if (!this.shouldRunOcr(extractedCharCount)) {
			return directDocuments;
		}

		console.log(`PDF looks scanned or text-light (${extractedCharCount} chars). Running OCR...`);
		const ocrDocuments = await this.loadPdfDocumentsFromOcr(pdfPath);
		const ocrCharCount = this.getExtractedCharCount(ocrDocuments);
		console.log(`OCR extraction complete (${ocrCharCount} chars).`);
		return ocrDocuments;
	}

	shouldRunOcr(extractedCharCount) {
		if (this.ocrMode === "off") {
			return false;
		}

		if (this.ocrMode === "always") {
			return true;
		}

		return extractedCharCount < this.ocrMinChars;
	}

	async loadPdfDocuments(pdfPath) {
		const pdfLoader = new PDFLoader(pdfPath);
		return pdfLoader.load();
	}

	getExtractedCharCount(documents) {
		return documents.reduce((sum, doc) => {
			const content = typeof doc.pageContent === "string" ? doc.pageContent : "";
			return sum + content.trim().length;
		}, 0);
	}

	async loadPdfDocumentsFromOcr(pdfPath) {
		let tempDir = "";

		try {
			tempDir = await mkdtemp(path.join(tmpdir(), "oilyrag-ocr-"));
			const outputPath = path.join(tempDir, "searchable.pdf");

			await execFileAsync("ocrmypdf", [
				"--skip-text",
				"--force-ocr",
				"--language",
				this.ocrLanguage,
				pdfPath,
				outputPath,
			]);

			return this.loadPdfDocuments(outputPath);
		} catch (error) {
			if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
				throw new Error("OCR requested but 'ocrmypdf' is not installed. Install it and try again.");
			}

			throw error;
		} finally {
			if (tempDir) {
				await rm(tempDir, { recursive: true, force: true });
			}
		}
	}

	shouldRunVision(extractedCharCount) {
		if (this.visionMode === "off") {
			return false;
		}

		if (this.visionMode === "always") {
			return true;
		}

		return extractedCharCount < this.visionMinChars;
	}

	async appendVisionContextIfNeeded(documents, pdfPath) {
		const extractedCharCount = this.getExtractedCharCount(documents);
		if (!this.shouldRunVision(extractedCharCount)) {
			return documents;
		}

		const visionDocuments = await this.buildVisionDocuments(pdfPath);
		if (visionDocuments.length === 0) {
			return documents;
		}

		console.log(`Added ${visionDocuments.length} vision summaries to retrieval context.`);
		return documents.concat(visionDocuments);
	}

	async buildVisionDocuments(pdfPath) {
		let tempDir = "";

		try {
			tempDir = await mkdtemp(path.join(tmpdir(), "oilyrag-vision-"));
			const outputPrefix = path.join(tempDir, "page");
			await execFileAsync("pdftoppm", [
				"-png",
				"-f",
				"1",
				"-l",
				String(this.visionMaxPages),
				pdfPath,
				outputPrefix,
			]);

			const imageFiles = await readdir(tempDir);
			const pagePngFiles = imageFiles
				.filter((fileName) => fileName.startsWith("page-") && fileName.endsWith(".png"))
				.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

			const visionDocuments = [];
			for (const fileName of pagePngFiles) {
				const pageNumber = this.parsePageNumber(fileName);
				if (pageNumber === null) {
					continue;
				}

				const imagePath = path.join(tempDir, fileName);
				const summary = await this.summarizePageWithVision(imagePath, pageNumber);
				if (!summary) {
					continue;
				}

				visionDocuments.push(new Document({
					pageContent: summary,
					metadata: {
						source: pdfPath,
						page: pageNumber,
						contentType: "vision-summary",
					},
				}));
			}

			return visionDocuments;
		} catch (error) {
			if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
				throw new Error("Vision requested but 'pdftoppm' was not found. Install poppler-utils and try again.");
			}

			throw error;
		} finally {
			if (tempDir) {
				await rm(tempDir, { recursive: true, force: true });
			}
		}
	}

	parsePageNumber(fileName) {
		const match = fileName.match(/^page-(\d+)\.png$/);
		if (!match) {
			return null;
		}

		return Number.parseInt(match[1], 10);
	}

	async summarizePageWithVision(imagePath, pageNumber) {
		const imageBuffer = await readFile(imagePath);
		const imageBase64 = imageBuffer.toString("base64");

		const response = await fetch("http://127.0.0.1:11434/api/generate", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: this.visionModel,
				stream: false,
				prompt: [
					`You are extracting repair knowledge from a workshop manual page image (page ${pageNumber}).`,
					"Summarize key technical details for retrieval:",
					"- major parts/components and labels",
					"- measurements, torque values, tolerances, warnings",
					"- step sequence if shown",
					"- notes from diagrams/flow arrows/legend",
					"Keep it factual and concise.",
				].join("\n"),
				images: [imageBase64],
			}),
		});

		if (!response.ok) {
			const bodyText = await response.text();
			throw new Error(`Vision model request failed (${response.status}): ${bodyText}`);
		}

		const payload = await response.json();
		const text = typeof payload.response === "string" ? payload.response.trim() : "";
		if (!text) {
			return "";
		}

		return `Vision page ${pageNumber}: ${text}`;
	}

	async splitDocuments(){
		console.log("Splitting documents...");
		const textSplitter = new RecursiveCharacterTextSplitter({ 
			chunkSize: this.chunkSize,
			chunkOverlap: this.chunkOverlap 
		});
		this.texts = await textSplitter.splitDocuments(this.documents);
	}

	async createVectorStore(){
		console.log("Creating document embeddings...");
		this.db = await MemoryVectorStore.fromDocuments(this.texts, this.selectEmbedding);
	}

	createRetriever(){
		console.log("Initialize vector store retriever...");
		this.retriever = this.db.asRetriever({ 
			k: this.kDocuments,
			searchType: this.searchType 
		});
	}

	async createChain(){
		console.log("Creating Retrieval QA Chain...");

		const prompt = ChatPromptTemplate.fromTemplate(`You are an elite mechanic and Mini specialist. You are advising a saavy garage mechanic who has all the tools available her would need to work on the vehicle in question. Answer the user's question: {input} based on the following context {context}`);

		const combineDocsChain = await createStuffDocumentsChain({
			llm: this.llm,
			prompt,
		});

		const chain = await createRetrievalChain({
			combineDocsChain,
			retriever: this.retriever,
		});

		return chain;
	}

	queryChain(){
		return this.chain;
	}

}

function parseCliArgs(argv) {
	const parsed = {};
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];

		if (!arg.startsWith("--")) {
			continue;
		}

		const withoutPrefix = arg.slice(2);
		const equalsIndex = withoutPrefix.indexOf("=");

		if (equalsIndex >= 0) {
			const key = withoutPrefix.slice(0, equalsIndex);
			const value = withoutPrefix.slice(equalsIndex + 1);
			parsed[key] = value;
			continue;
		}

		const key = withoutPrefix;
		const nextArg = argv[i + 1];
		if (nextArg && !nextArg.startsWith("--")) {
			parsed[key] = nextArg;
			i += 1;
		} else {
			parsed[key] = true;
		}
	}

	return parsed;
}

function printUsage() {
	console.log("Usage: node index.js [options]");
	console.log("");
	console.log("Optional:");
	console.log("  --query             Initial question to ask before entering chat mode");
	console.log("  --document          Source document path (default: ./materials/mini-manual.txt)");
	console.log("  --model             Ollama chat model (default: llama3)");
	console.log("  --embeddingModel    Ollama embedding model (default: nomic-embed-text:latest)");
	console.log("  --chunkSize         Splitter chunk size (default: 1000)");
	console.log("  --chunkOverlap      Splitter chunk overlap (default: 100)");
	console.log("  --ocrMode           OCR mode: auto | always | off (default: auto)");
	console.log("  --ocrLanguage       OCR language for ocrmypdf/tesseract (default: eng)");
	console.log("  --ocrMinChars       In auto mode, OCR if extracted chars are below this (default: 250)");
	console.log("  --visionMode        Vision mode: off | auto | always (default: off)");
	console.log("  --visionModel       Ollama vision model (default: llava:latest)");
	console.log("  --visionMaxPages    Max PDF pages to analyze with vision (default: 8)");
	console.log("  --visionMinChars    In auto mode, run vision if chars are below this (default: 250)");
	console.log("  --searchType        Retriever search type (default: similarity)");
	console.log("  --kDocuments        Number of docs to retrieve (default: 5)");
	console.log("  --once              Answer one question and exit (requires --query)");
	console.log("  --help              Show this help");
	console.log("");
	console.log("OCR dependency:");
	console.log("  Requires 'ocrmypdf' installed and available on PATH.");
	console.log("Vision dependencies:");
	console.log("  Requires 'pdftoppm' (poppler-utils) and an Ollama vision model available locally.");
}

function modelNameCandidates(modelName) {
	if (modelName.includes(":")) {
		const [base] = modelName.split(":", 1);
		return [modelName, base];
	}

	return [modelName, `${modelName}:latest`];
}

async function preflightVision(config) {
	if (config.visionMode === "off") {
		return;
	}

	let stdoutText = "";
	try {
		const result = await execFileAsync("ollama", ["list"]);
		stdoutText = typeof result.stdout === "string" ? result.stdout : "";
	} catch (error) {
		if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
			throw new Error("Vision mode is enabled, but the 'ollama' CLI was not found in PATH.");
		}

		throw new Error(`Unable to run 'ollama list' for vision preflight: ${error.message}`);
	}

	const installedModels = new Set(
		stdoutText
			.split("\n")
			.slice(1)
			.map((line) => line.trim())
			.filter((line) => line.length > 0)
			.map((line) => line.split(/\s+/)[0])
	);

	const candidates = modelNameCandidates(config.visionModel);
	const found = candidates.some((name) => installedModels.has(name));
	if (found) {
		return;
	}

	throw new Error(
		`Vision model '${config.visionModel}' is not installed locally. ` +
		`Install one with: ollama pull ${config.visionModel}`
	);
}

async function askQuestion(chain, userInput, chatHistory) {
	const result = await chain.invoke({
		input: userInput,
		chat_history: chatHistory,
	});

	console.log(`\nAssistant: ${result.answer}\n`);
	chatHistory.push(userInput, result.answer);
}

async function runInteractiveChat(chain, initialQuery = "") {
	const chatHistory = [];
	const rl = createInterface({ input, output });

	console.log("Chat ready. Type your question and press Enter.");
	console.log("Type 'exit' or 'quit' to end the chat.\n");

	try {
		if (initialQuery) {
			await askQuestion(chain, initialQuery, chatHistory);
		}

		while (true) {
			const userInput = (await rl.question("You: ")).trim();

			if (!userInput) {
				continue;
			}

			const lowered = userInput.toLowerCase();
			if (lowered === "exit" || lowered === "quit") {
				console.log("\nEnding chat.");
				break;
			}

			await askQuestion(chain, userInput, chatHistory);
		}
	} finally {
		rl.close();
	}
}

async function main() {
	const args = parseCliArgs(process.argv.slice(2));

	if (args.help || args.h) {
		printUsage();
		return;
	}

	const query = typeof args.query === "string" ? args.query.trim() : "";
	if (args.once && !query) {
		console.error("Error: --once requires a --query argument.");
		printUsage();
		process.exitCode = 1;
		return;
	}

	const config = {
		model: typeof args.model === "string" ? args.model : "llama3",
		document: typeof args.document === "string" ? args.document : "./materials/mini-manual.txt",
		embeddingModel: typeof args.embeddingModel === "string" ? args.embeddingModel : "nomic-embed-text:latest",
		chunkSize: Number.parseInt(args.chunkSize ?? "1000", 10),
		chunkOverlap: Number.parseInt(args.chunkOverlap ?? "100", 10),
		ocrMode: typeof args.ocrMode === "string"
			? args.ocrMode.toLowerCase()
			: (args.ocr ? "always" : "auto"),
		ocrLanguage: typeof args.ocrLanguage === "string" ? args.ocrLanguage : "eng",
		ocrMinChars: Number.parseInt(args.ocrMinChars ?? "250", 10),
		visionMode: typeof args.visionMode === "string"
			? args.visionMode.toLowerCase()
			: (args.vision ? "always" : "off"),
		visionModel: typeof args.visionModel === "string" ? args.visionModel : "llava:latest",
		visionMaxPages: Number.parseInt(args.visionMaxPages ?? "8", 10),
		visionMinChars: Number.parseInt(args.visionMinChars ?? "250", 10),
		searchType: typeof args.searchType === "string" ? args.searchType : "similarity",
		kDocuments: Number.parseInt(args.kDocuments ?? "5", 10),
	};

	if (
		Number.isNaN(config.chunkSize) ||
		Number.isNaN(config.chunkOverlap) ||
		Number.isNaN(config.kDocuments) ||
		Number.isNaN(config.ocrMinChars) ||
		Number.isNaN(config.visionMaxPages) ||
		Number.isNaN(config.visionMinChars)
	) {
		console.error("Error: chunkSize, chunkOverlap, kDocuments, ocrMinChars, visionMaxPages, and visionMinChars must be valid integers.");
		process.exitCode = 1;
		return;
	}

	if (!["auto", "always", "off"].includes(config.ocrMode)) {
		console.error("Error: ocrMode must be one of: auto, always, off.");
		process.exitCode = 1;
		return;
	}

	if (!["off", "auto", "always"].includes(config.visionMode)) {
		console.error("Error: visionMode must be one of: off, auto, always.");
		process.exitCode = 1;
		return;
	}

	if (config.visionMaxPages <= 0) {
		console.error("Error: visionMaxPages must be greater than 0.");
		process.exitCode = 1;
		return;
	}

	try {
		await preflightVision(config);
		const docQa = await new DocumentQA(config).init();
		const chain = docQa.queryChain();

		if (args.once) {
			const result = await chain.invoke({ input: query });
			console.log(result.answer);
			return;
		}

		await runInteractiveChat(chain, query);
	} catch (error) {
		console.error("Error running document QA:", error);
		process.exitCode = 1;
	}
}

await main();
