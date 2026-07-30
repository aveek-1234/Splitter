import type { RetrievedDocument } from "@/lib/ai/prompt";

export type ChatSource = {
  score: number;
  payload: RetrievedDocument;
};

export type AskQuestionResult = {
  answer: string;
  sources: ChatSource[];
};

export async function askChatQuestion(
  question: string,
): Promise<AskQuestionResult> {
  const response = await fetch("/api/chatbot/ask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  const data = (await response.json()) as AskQuestionResult & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Failed to get an answer");
  }

  return {
    answer: data.answer,
    sources: data.sources ?? [],
  };
}
