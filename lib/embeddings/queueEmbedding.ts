type QueueEmbeddingParams = {
  action: "upsert" | "delete";
  sourceTable: "expenses" | "settlements";
  sourceId: string;
};

export async function queueEmbedding({
  action,
  sourceTable,
  sourceId,
}: QueueEmbeddingParams): Promise<void> {
  try {
    const response = await fetch("/api/embeddings/queue", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, sourceTable, sourceId }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(
        `Failed to queue embedding (${response.status}): ${text}`,
      );
    }
  } catch (error) {
    console.error("Failed to queue embedding", error);
  }
}
