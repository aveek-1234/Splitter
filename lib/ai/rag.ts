import { embedText } from "./embeddings";
import { buildPrompt, RetrievedDocument } from "./prompt";
import { generateAnswer } from "./groq";
import { searchVectors, QdrantSearchResult } from "./qdrant";

export interface RagResponse {
  answer: string;
  sources: QdrantSearchResult<RetrievedDocument>[];
}

export async function askQuestion(
  question: string,
  limit = 5,
): Promise<RagResponse> {
  if (typeof question !== "string" || question.trim().length === 0) {
    throw new Error("askQuestion requires a non-empty question.");
  }

  const queryEmbedding = await embedText(question);

  const searchResults = await searchVectors<RetrievedDocument>(
    queryEmbedding,
    limit,
  );

  const documents = searchResults.map((result) => result.payload);
  const prompt = buildPrompt(question, documents);

  const answer = await generateAnswer(prompt);

  return {
    answer,
    sources: searchResults,
  };
}
