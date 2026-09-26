export type ChatSource = {
  score: number;
  payload: {
    text?: string;
    sourceTable?: string;
    sourceId?: string;
    entityType?: string;
    createdAt?: string | number;
    [key: string]: unknown;
  };
};

export type AskQuestionResult = {
  answer: string;
  sources: ChatSource[];
  toolsUsed: string[];
  ragUsed: boolean;
};

export async function askChatQuestion(
  question: string,
  token?: string | null,
): Promise<AskQuestionResult> {
  const response = await fetch("/api/chatbot/ask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    toolsUsed: data.toolsUsed ?? [],
    ragUsed: Boolean(data.ragUsed),
  };
}
