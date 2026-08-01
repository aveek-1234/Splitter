import { inngest } from "./client";
import { deleteQdrantPoint } from "@/lib/ai/vectorStore";

export const vectorEmbeddingsDelete = inngest.createFunction(
  {
    id: "vector-embeddings-delete",
    retries: 3,
  },
  {
    event: "vector.embeddings.delete",
  },
  async ({ step, event }) => {
    const { sourceTable, sourceId } = event.data as {
      sourceTable: "expenses";
      sourceId: string;
    };

    await step.run("delete-qdrant-point", async () => {
      await deleteQdrantPoint(sourceTable, sourceId);
    });

    return {
      deleted: true,
      sourceTable,
      sourceId,
    };
  },
);
