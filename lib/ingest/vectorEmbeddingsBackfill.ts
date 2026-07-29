import { ConvexHttpClient } from "convex/browser";
import { inngest } from "./client";
import { api } from "@/convex/_generated/api";
import {
  buildQdrantPoint,
  chunk,
  EmbeddableDocument,
  ensureQdrantCollection,
  embedTexts,
  QDRANT_COLLECTION,
  upsertQdrantPoints,
} from "@/lib/ai/vectorStore";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const DEFAULT_BATCH_SIZE = Number(process.env.EMBEDDING_BATCH_SIZE ?? 20);

export const vectorEmbeddingsBackfill = inngest.createFunction(
  {
    id: "vector-embeddings-backfill",
  },
  {
    event: "vector.embeddings.backfill",
  },
  async ({ step, event }) => {
    const batchSize = Math.max(
      1,
      Math.min(Number(event.data?.batchSize ?? DEFAULT_BATCH_SIZE), 50),
    );

    await step.run("ensure-qdrant-collection", async () => {
      await ensureQdrantCollection();
    });

    const documents = (await step.run(
      "fetch-embeddable-documents",
      async () => {
        return await convex.query(api.embeddings.getAllEmbeddableDocuments, {});
      },
    )) as unknown as EmbeddableDocument[];

    console.log(
      `[vectorEmbeddingsBackfill] Found ${documents.length} embeddable documents`,
    );

    let totalProcessed = 0;

    for (const batch of chunk(documents, batchSize)) {
      const embeddings = (await step.run(
        `generate-embeddings-${batch[0].sourceId}`,
        async () => {
          return await embedTexts(batch.map((doc) => doc.text));
        },
      )) as unknown as number[][];

      const points = batch.map((doc, index) =>
        buildQdrantPoint(doc, embeddings[index]),
      );

      await step.run(`upsert-qdrant-${batch[0].sourceId}`, async () => {
        await upsertQdrantPoints(points);
      });

      totalProcessed += batch.length;

      await step.sleep(`rate-limit-${batch[0].sourceId}`, "500ms");
    }

    return {
      processed: totalProcessed,
      batchSize,
      collection: QDRANT_COLLECTION,
    };
  },
);
