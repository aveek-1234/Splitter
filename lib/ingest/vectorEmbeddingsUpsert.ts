import { ConvexHttpClient } from "convex/browser";
import { inngest } from "./client";
import { api } from "@/convex/_generated/api";
import {
  buildQdrantPoint,
  EmbeddableDocument,
  ensureQdrantCollection,
  embedTexts,
  upsertQdrantPoints,
} from "@/lib/ai/vectorStore";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const vectorEmbeddingsUpsert = inngest.createFunction(
  {
    id: "vector-embeddings-upsert",
    retries: 3,
  },
  {
    event: "vector.embeddings.upsert",
  },
  async ({ step, event }) => {
    const { sourceTable, sourceId } = event.data as {
      sourceTable: "expenses" | "settlements";
      sourceId: string;
    };

    await step.run("ensure-qdrant-collection", async () => {
      await ensureQdrantCollection();
    });

    const document = (await step.run("fetch-embeddable-document", async () => {
      return await convex.query(api.embeddings.getEmbeddableDocument, {
        sourceTable,
        sourceId,
      });
    })) as unknown as EmbeddableDocument | null;

    if (!document) {
      console.log(
        `[vectorEmbeddingsUpsert] No document found for ${sourceTable}:${sourceId}`,
      );
      return { skipped: true, sourceTable, sourceId };
    }

    const embeddings = (await step.run("generate-embedding", async () => {
      return await embedTexts([document.text]);
    })) as unknown as number[][];

    const point = buildQdrantPoint(document, embeddings[0]);

    await step.run("upsert-qdrant", async () => {
      await upsertQdrantPoints([point]);
    });

    return {
      upserted: true,
      sourceTable,
      sourceId,
    };
  },
);
