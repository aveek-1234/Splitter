import { embedText } from "./embeddings";
import { buildPrompt, buildHybridPrompt, type RetrievedDocument } from "./prompt";
import { generateAnswer } from "./groq";
import { searchVectors, type QdrantSearchResult } from "./qdrant";

export interface RagResponse {
  answer: string;
  sources: QdrantSearchResult<RetrievedDocument>[];
}

export async function searchRelatedDocuments(
  question: string,
  limit = 5,
): Promise<QdrantSearchResult<RetrievedDocument>[]> {
  const queryEmbedding = await embedText(question);
  return searchVectors<RetrievedDocument>(queryEmbedding, limit);
}

export async function askQuestion(
  question: string,
  limit = 5,
): Promise<RagResponse> {
  if (typeof question !== "string" || question.trim().length === 0) {
    throw new Error("askQuestion requires a non-empty question.");
  }

  const searchResults = await searchRelatedDocuments(question, limit);
  const documents = searchResults.map((result) => result.payload);
  const prompt = buildPrompt(question, documents);

  const answer = await generateAnswer(prompt);

  return {
    answer,
    sources: searchResults,
  };
}

export async function askHybridQuestion(
  question: string,
  structuredContext: unknown,
  dateContext: unknown,
  ragLimit = 5,
): Promise<RagResponse> {
  if (typeof question !== "string" || question.trim().length === 0) {
    throw new Error("askHybridQuestion requires a non-empty question.");
  }

  let searchResults: QdrantSearchResult<RetrievedDocument>[] = [];

  try {
    searchResults = await searchRelatedDocuments(question, ragLimit);
  } catch (error) {
    console.warn("RAG enrichment skipped", error);
  }

  const ragDocuments = searchResults.map((result) => result.payload);
  const prompt = buildHybridPrompt(
    question,
    structuredContext,
    dateContext,
    ragDocuments,
  );
  const answer = await generateAnswer(
    prompt,
    "You are Splitter's expense assistant. Calculate numbers from the provided structured context when needed. Be friendly and practical.",
  );

  return {
    answer,
    sources: searchResults,
  };
}
