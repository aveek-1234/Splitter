export interface RetrievedDocument {
  sourceTable?: string;
  sourceId?: string;
  entityType?: string;
  entityId?: string;
  text?: string;
  createdAt?: string | number;
  [key: string]: unknown;
}

export function buildPrompt(
  question: string,
  documents: RetrievedDocument[],
): string {
  if (typeof question !== "string" || question.trim().length === 0) {
    throw new Error("buildPrompt requires a non-empty question.");
  }

  const formattedDocuments = documents
    .map((document, index) => {
      const visiblePayload = {
        sourceTable: document.sourceTable,
        sourceId: document.sourceId,
        entityType: document.entityType,
        entityId: document.entityId,
        text: document.text,
        createdAt: document.createdAt,
      };

      return `Document ${index + 1}:
${JSON.stringify(visiblePayload, null, 2)}`;
    })
    .join("\n\n");

  return [
    `You are an AI assistant for an expense management application.`,
    `Answer ONLY using the supplied context.`,
    `If the answer is unavailable in the context, say you do not know.`,
    `Never hallucinate.`,
    "",
    `Context:\n${formattedDocuments}`,
    "",
    `Question:\n${question}`,
  ].join("\n");
}
