# STEP BY STEP

  > Accompanying [YouYube video](https://www.youtube.com/watch?v=INUWI6ZbLwQ&list=PLdo7hJB0agElRmR33xq3x2lTFDaiwqg88&index=2)

  - Change to the `/step-by-step/` folder and study each step carefully.

  - `cd step-by-step/`

  - **NOTE:** Make sure to have [Ollama installed and running](https://www.youtube.com/watch?v=0n3D2nNq7AE) before running the examples.

## STEP 01: Create a Class and instantiate it

  > Accompanying [YouYube video](https://www.youtube.com/watch?v=iZESlvAnKLE&list=PLdo7hJB0agElRmR33xq3x2lTFDaiwqg88&index=3)

  - Source: `/step-by-step/step-01.js`

  - Run the code: `node step-01.js`

  - Output: `{ pdfQa: PdfQA {} }`

## STEP 02: Initialize a Language Model

  > Accompanying [YouYube video](https://www.youtube.com/watch?v=ssKeTy1Lc6k&list=PLdo7hJB0agElRmR33xq3x2lTFDaiwqg88&index=3)

  - Source: `/step-by-step/step-02.js`

  - Install dependencies: `npm install`
    - `Ollama`

  - Make sure that Ollama is running and that you have downloaded the `llama3` model using: `ollama pull llama3:latest`

  - Run the code: `node step-02.js`

  - Output: 
  
  ```js
  pdfQa: PdfQA {
    model: 'llama3',
    llm: Ollama {}
  }
  ```

## STEP 03: Chat with the loaded model

  > Accompanying [YouYube video](https://www.youtube.com/watch?v=WIGRjvVP4-M&list=PLdo7hJB0agElRmR33xq3x2lTFDaiwqg88&index=4)

  - Source: `/step-by-step/step-03.js`

  - Run the code: `node step-03.js`

  - Output: `The capital of Zimbabwe is Harare.`
  
## STEP 04: Load PDF Document

  > Accompanying [YouYube video](https://www.youtube.com/watch?v=3lW9RcJFMTg&list=PLdo7hJB0agElRmR33xq3x2lTFDaiwqg88&index=5)

  - Source: `/step-by-step/step-04.js`

  - Install dependencies: `npm install`
    - `PDFLoader`

  - Run the code: `node step-04.js`

  - Output: the number of documents created from the PDF `pycharm-documentation-mini.pdf` should be 9 according to the default PDFLoader settings. You should also be able to see the text content of the first Document created from the PDF along with the accompanying metadata.

## STEP 05: Split the Documents created by the PDFLoader into small chunks

  > Accompanying [YouYube video](https://www.youtube.com/watch?v=qSNZeQ2wcPE&list=PLdo7hJB0agElRmR33xq3x2lTFDaiwqg88&index=6)

  - Source: `/step-by-step/step-05.js`

  - Install dependencies: `npm install`
    - `CharacterTextSplitter`
    - `path`

  - Run the code: `node step-05.js`

  - Output: according to the provided `chunkSize` (1000) and `chunkOverlap` (0) settings, you will get 14 text chunks from the text splitter.

  - See how this works through [this online demo](https://chunkviz.up.railway.app/)

## STEP 06: Vectorize the (split) Documents and add them to the Vector Store

  > Accompanying [YouYube video](https://www.youtube.com/watch?v=-UVvF8L6qyY&list=PLdo7hJB0agElRmR33xq3x2lTFDaiwqg88&index=7)

  In this step we turn every document into a vector and store it in our in-memory vector store.

  We can also directly query the vector store and find relevant documents based on some input.

  - Source: `/step-by-step/step-06.js`

  - Install dependencies: `npm install`
    - `MemoryVectorStore`
    - `CharacterTextSplitter`
    - `OllamaEmbeddings`

  - Run the code: `node step-06.js`

  - Output:

  ```
  Embeddings model:  all-minilm:latest
  # of embeddings:  14

  Document pages related to our query:
  * {"pageNumber":3,"lines":{"from":40,"to":45}}
  * {"pageNumber":6,"lines":{"from":1,"to":17}}

  Document pages and their score related to our query:
  * [SIM=0.592] [Page number: 3]
  * [SIM=0.581] [Page number: 6]
  * [SIM=0.580] [Page number: 7]
  * [SIM=0.570] [Page number: 5]
  * [SIM=0.561] [Page number: 8]
  * [SIM=0.507] [Page number: 7]
  * [SIM=0.487] [Page number: 3]
  * [SIM=0.424] [Page number: 4]
  * [SIM=0.405] [Page number: 6]
  * [SIM=0.378] [Page number: 9]
  ```

## STEP 07: Configure a Vector store retriever

  > Accompanying [YouYube video](https://www.youtube.com/watch?v=AYjXZ0YUD6A&list=PLdo7hJB0agElRmR33xq3x2lTFDaiwqg88&index=8)

  This component will search the vector store for relevant documents.

  - Source: `/step-by-step/step-07.js`

  - Run the code: `node step-07.js`

  - Output: 

  ```
  # of returned documents:  5
  Search type:  similarity
  ```

## STEP 08: Create the query => search => results Chain:

  > Accompanying [YouYube video](https://www.youtube.com/watch?v=z-FDZcvKr1w&list=PLdo7hJB0agElRmR33xq3x2lTFDaiwqg88&index=9)

  - Source: `/step-by-step/step-08.js`

  - Install dependencies: `npm install`
    - `RetrievalQAChain`

  - Run the code: `node step-08.js`

  - Output: The output should be a relevant response according to the documentation. For example something like this:

  ```
  🤖 According to the context, you can add a custom file type association in PyCharm by:

  1. Pressing ⌘Сmd to open the IDE settings and then selecting Editor | File Types.
  2. In the Recognized File Types list, selecting the file type that you want to associate with other filename patterns.
  3. Using the File name patterns section to make the necessary changes, which can include adding a new pattern (), removing an existing one (), or modifying an existing pattern ().

  Additionally, if PyCharm cannot identify the type of the file you are trying to open or create, it will display the Register New File Type Association dialog where you can choose how to process the file.   
  ```

## STEP 09: Replacing legacy RetrievalQAChain

  > Accompanying [YouYube video](https://www.youtube.com/watch?v=i0daoBdB7NE&list=PLdo7hJB0agElRmR33xq3x2lTFDaiwqg88&index=10)

  According to the official documentation, the legacy `RetrievalQAChain` class is deprecated as of version 2.x and will be completely removed in the upcoming 3.x version.

  The API reference provides an alternative. In this step, we replace the `RetrievalQAChain` with the proposed setup. Here is the [reference link](https://v02.api.js.langchain.com/classes/langchain.chains.RetrievalQAChain.html) that contains the suggested refactoring.

  - Source: `/step-by-step/step-09.js`

  - Install dependencies: `npm install`
    - `ChatPromptTemplate`
    - `createStuffDocumentsChain`
    - `createRetrievalChain`

  - Run the code: `node step-09.js`

  - Output: you will get an answer along with the number of documents used as context to the LLM's response.

  References and Resources:

  - [Python deprecation notice](https://api.python.langchain.com/en/latest/chains/langchain.chains.retrieval_qa.base.RetrievalQA.html)

  - [Retrieval QA for JS (version 0.1, deprecated)](https://js.langchain.com/v0.1/docs/modules/chains/popular/vector_db_qa_legacy/)

## STEP 10: Set up memory and use last answer to ask follow up questions / Ask in german

  > Accompanying [YouYube video](https://www.youtube.com/watch?v=NE2gl94CxLU&list=PLdo7hJB0agElRmR33xq3x2lTFDaiwqg88&index=11)

  We set up a short-term memory so that the retriever can get some extra content the next time we ask a question. The previous question and related response is passed as context.

  Also, we are looping through the relevant documents that were found through the retriever and ask a question in german.

  - Source: `/step-by-step/step-10.js`

  - Run the code: `node step-10.js`

# Extras

## STEP 10.2: Load Multiple PDF Documents from a Directory

  The script [/v0.3/extras-step-10.2.js](../v0.3/extras-step-10.2.js) answers the following question: [`how to embed multiple files?`](https://www.youtube.com/watch?v=NE2gl94CxLU&lc=UgwCacK44SKM7LQXrWl4AaABAg.AFC5sZR6AsVAFChRGq_P6o).

  The script integrates code from the [documentation](https://js.langchain.com/docs/integrations/document_loaders/file_loaders/pdf/#loading-directories) which loads multiple PDF files from a specified directory path:

  ```js
  const pdfDocumentsPath = "../materials/papers/";

  const pdfQa = await new PdfQA({ 
    model: "llama3.1:latest", 
    pdfDocumentsPath,
    ...
  }).init();
  ``` 

  **Important:** the script is based on version `0.3` of LangChain as opposed to the scripts found inside the `step-by-step` folder which are all based on version `0.2`. The script also uses the `llama3.1` model via Ollama. Feel free to configure a custom model, either through the `Ollama` class found inside the `initChatModel()` method or by importing and using another chat model [available from LangChain](https://js.langchain.com/docs/integrations/chat/).

## STEP 11: Optimizations: Temperature & Text Splitter

  Here are some extra optimizations and updates to the code from the previous step (10):

  - A new `temperature` parameter has been added to the class that configures the model's temperature.
  - The `CharacterTextSplitter` has been replaced by the `RecursiveCharacterTextSplitter`.
  
  From the [docs](https://js.langchain.com/v0.1/docs/modules/data_connection/document_transformers/#get-started-with-text-splitters):

  > "The recommended TextSplitter is the RecursiveCharacterTextSplitter. This will split documents recursively by different characters - starting with "\n\n", then "\n", then " ". This is nice because it will try to keep all the semantically relevant content in the same place for as long as possible." 

  To learn more about how the RecursiveCharacterTextSplitter works and the different strategies that one might pick for particular cases, watch this [excellent explanation](https://www.youtube.com/watch?v=n0uPzvGTFI0).

  Visit this [online app](https://chunkviz.up.railway.app/) to see how different text splitting strategies work.

  - Source: `/step-by-step/extras-step-11.js`

  - Run the code: `node step-11.js`

  References and Resources:

  - [How to recursively split text by characters](https://js.langchain.com/v0.2/docs/how_to/recursive_text_splitter/)

  - [How to Optimize Chunk Size for RAG in Production?](https://pub.towardsai.net/how-to-optimize-chunk-sizes-for-rag-in-production-fae9019796b6)

## STEP 12: Optimizations: MMR Retriever & Better Embeddings Model

  - We are switching from the `all-minilm` Embeddings model to the more powerful `nomic-embed-text` model provided by Ollama. To install the model you must run the following command: `ollama pull nomic-embed-text:latest`

  - We are switching from the default "similarity" to `Maximal Marginal Relevance` (MMR) settings for the retriever. 

  From the [LlamaIndex docs](https://docs.llamaindex.ai/en/stable/examples/vector_stores/SimpleIndexDemoMMR/):

  > "By using maximum marginal relevance, one can iteratively find documents that are dissimilar to previous results."

  From the [docs](https://python.langchain.com/v0.1/docs/modules/model_io/prompts/example_selectors/mmr/):

  > "The Max Marginal Relevance selects examples based on a combination of which examples are most similar to the inputs, while also optimizing for diversity. It does this by finding the examples with the embeddings that have the greatest cosine similarity with the inputs, and then iteratively adding them while penalizing them for closeness to already selected examples."
  
  - Source: `/step-by-step/extras-step-12.js`

  - Run the code: `node step-12.js`

  References and Resources:

  - [Simple Vector Stores - Maximum Marginal Relevance Retrieval](https://docs.llamaindex.ai/en/stable/examples/vector_stores/SimpleIndexDemoMMR/)

  - [Maximum Marginal Relevance (MMR)](https://community.fullstackretrieval.com/retrieval-methods/maximum-marginal-relevance)

  - **Documents**
    - [Paul Graham, What I Worked On (Text version)](https://raw.githubusercontent.com/run-llama/llama_index/main/docs/docs/examples/data/paul_graham/paul_graham_essay.txt)
    - [Paul Graham, What I Worked On (Essay)](https://paulgraham.com/worked.html)

## STEP 13: Replace InMemory Vector Store with ChromaDB

  - Install dependencies: `npm install`
    - `chromadb`

  - Install `Docker`
  - Run Chroma using Docker on your computer:
    - `docker pull chromadb/chroma`
    - `docker run -p 8000:8000 chromadb/chroma`

  - Source: `/step-by-step/extras-step-13.js`

  - Run the code: `node step-13.js`

  References and Resources:

  - [LangChain Docs: Chroma](https://js.langchain.com/v0.2/docs/integrations/vectorstores/chroma/)

  - [Getting Started with Chroma](https://docs.trychroma.com/getting-started)

---

## TO BE ADDED:

  - Implement [TextLoader](https://js.langchain.com/v0.2/docs/integrations/document_loaders/file_loaders/text/) / [Ref](https://v02.api.js.langchain.com/classes/langchain.document_loaders_fs_text.TextLoader.html)
  - Implement custom document loader. [Ref](https://js.langchain.com/v0.2/docs/how_to/document_loader_custom/)
  - Implement text summarization. [Ref](https://js.langchain.com/v0.2/docs/tutorials/summarization/)
  - Implement web loaders and test with news sources: [https://lite.cnn.com/](https://lite.cnn.com/)
  - Create and integrate `Excalidraw` and `Draw.io` diagrams to accompany each step.
  - Implement saving and loading of embeddings in InMemory Vector store.

  - Extra step: [Load Data from Directory](https://js.langchain.com/v0.2/docs/how_to/document_loader_directory/) and allow loading multiple documents. [Ref](https://js.langchain.com/v0.2/docs/integrations/document_loaders/file_loaders/pdf/)
  - Extra step: implement [ScoreThresholdRetriever](https://js.langchain.com/v0.2/docs/how_to/parent_document_retriever/#with-score-threshold)
  - Extra step: implement [MaxMarginalRelevanceExampleSelector](https://python.langchain.com/v0.1/docs/modules/model_io/prompts/example_selectors/mmr/)
  - Extra step: use OpenAI LLM and Embeddings model
  - Extra step: use Anthropic's Claude
  - Extra step: use TensorFlow.js Embeddings. [Ref](https://github.com/ollama/ollama/blob/main/docs/tutorials/langchainjs.md)
  - Extra step: use Retriever filters. [Ref](https://www.reddit.com/r/LangChain/comments/12qn2qi/filter_with_retriever/)
  - Extra step: use History-aware Retriever. [Ref](https://v02.api.js.langchain.com/functions/langchain.chains_history_aware_retriever.createHistoryAwareRetriever.html)
  - Extra step: use custom prompts. [Ref](https://smith.langchain.com/hub/rlm/rag-prompt). Example: `const prompt = await pull<ChatPromptTemplate>("rlm/rag-prompt");`
