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

export function buildHybridPrompt(
  question: string,
  structuredContext: unknown,
  dateContext: unknown,
  ragDocuments: RetrievedDocument[] = [],
): string {
  if (typeof question !== "string" || question.trim().length === 0) {
    throw new Error("buildHybridPrompt requires a non-empty question.");
  }

  const ragSection =
    ragDocuments.length > 0
      ? ragDocuments
          .map((document, index) => {
            return `Related record ${index + 1}:
${JSON.stringify(
  {
    sourceTable: document.sourceTable,
    sourceId: document.sourceId,
    entityType: document.entityType,
    text: document.text,
    createdAt: document.createdAt,
  },
  null,
  2,
)}`;
          })
          .join("\n\n")
      : "No additional vector-search records were retrieved.";

  return [
    `You are Splitter's expense assistant.`,
    `Answer using the structured expense context below as your primary source of truth.`,
    `When the user asks for totals, balances, or what they still need to settle, calculate from expenses, settlements, and balances in the context.`,
    `Positive netBalance means the counterparty owes the user; negative means the user owes the counterparty.`,
    `For relative dates (today, this week, this month, last month), use the current date context.`,
    `You may also use related vector-search records for fuzzy recall across history.`,
    `If the data does not contain the answer, say so clearly. Never invent transactions.`,
    "",
    `Current date context:\n${JSON.stringify(dateContext, null, 2)}`,
    "",
    `Structured expense context:\n${JSON.stringify(structuredContext, null, 2)}`,
    "",
    `Related vector-search records:\n${ragSection}`,
    "",
    `User question:\n${question}`,
  ].join("\n");
}
