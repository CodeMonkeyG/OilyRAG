import { Ollama, OllamaEmbeddings } from "@langchain/ollama";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import path from "node:path";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";
// Loading Multiple PDF Documents:
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { writeFile, readFile } from 'fs/promises';

// EXTRA STEP: 10.2 - Loading multiple PDF documents
// References: https://js.langchain.com/docs/integrations/document_loaders/file_loaders/pdf/#loading-directories

class PdfQA {

  constructor({ model, pdfDocumentsPath, chunkSize, chunkOverlap, searchType = "similarity", kDocuments }) {

    this.model             = model;
    this.pdfDocumentsPath  = pdfDocumentsPath;
    this.chunkSize         = chunkSize;
    this.chunkOverlap      = chunkOverlap;

    this.searchType        = searchType;
    this.kDocuments        = kDocuments;

  }

  async init(){
    this.initChatModel();
    await this.loadDocuments();
    await this.splitDocuments();
    this.selectEmbedding = new OllamaEmbeddings({ model: "nomic-embed-text:latest" });
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
    console.log("Loading PDFs...");
    /* Load all PDFs within the specified directory */
    const directoryLoader = new DirectoryLoader(this.pdfDocumentsPath, {
      ".pdf": (path) => {
        console.log(`Loading ${path} document...`);
        return new PDFLoader(path)
      },
    });
    this.documentsPath = await directoryLoader.load();
  }

  async splitDocuments(){
    console.log("Splitting documents...");
    const textSplitter = new RecursiveCharacterTextSplitter({
      separator: " ",
      chunkSize: this.chunkSize,
      chunkOverlap: this.chunkOverlap,
    });
    this.texts = await textSplitter.splitDocuments(this.documentsPath);
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

    const prompt = ChatPromptTemplate.fromTemplate(`Answer the user's question: {input} based on the following context {context}`);

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

const pdfDocumentsPath = "../materials/papers/";

const pdfQa = await new PdfQA({ 
  // Make sure to pick the right model, depending on the ones you've downloaded via Ollama:
  model: "llama3.1:latest", 
  pdfDocumentsPath,
  chunkSize: 1000,
  chunkOverlap: 0,
  searchType: "similarity",
  kDocuments: 5 
}).init();

const pdfQaChain = pdfQa.queryChain();

const answer1 = await pdfQaChain.invoke({ 
  input: "What is Chain-of-Thought?" 
});
console.log( "🤖", answer1.answer, "\n" );
console.log( "# of documents used as context: ", answer1.context.length, "\n" );

const answer2 = await pdfQaChain.invoke({ 
  input: "What is the ReAct architecture all about?" 
});
console.log( "🤖", answer2.answer, "\n" );
console.log( "# of documents used as context: ", answer2.context.length, "\n" );

// Irrelevant (to the docs) question:
const answer3 = await pdfQaChain.invoke({ 
  input: "Who is Julio Iglesias?" 
});
console.log( "🤖", answer3.answer, "\n" );
console.log( "# of documents used as context: ", answer3.context.length, "\n" );

// NOTE: Follow-up questions (anything more to add, ask and respond in German) are omitted. See step-10.js for them. 

