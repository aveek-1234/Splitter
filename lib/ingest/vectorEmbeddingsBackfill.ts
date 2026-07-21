import { ConvexHttpClient } from "convex/browser";
import { inngest } from "./client";
import { api } from "@/convex/_generated/api";
import { v5 as uuidv5 } from "uuid";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const QDRANT_URL = (process.env.QDRANT_URL ?? "http://localhost:6333").replace(
  /\/$/,
  "",
);
const QDRANT_COLLECTION =
  process.env.QDRANT_COLLECTION ?? "splitter_embeddings";
const DEFAULT_BATCH_SIZE = Number(process.env.EMBEDDING_BATCH_SIZE ?? 20);
const EMBEDDING_MODEL = process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";
const EMBEDDING_DIMENSIONS = 768;
const UUID_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

type EmbeddableDocument = {
  sourceTable: "users" | "groups" | "expenses" | "settlements";
  sourceId: string;
  entityType: string;
  entityId: string;
  text: string;
  createdAt: number;
};

type EmbeddingBatchResult = number[][];

type QdrantPoint = {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
};

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }

  return result;
}

async function ensureQdrantCollection() {
  const response = await fetch(
    `${QDRANT_URL}/collections/${QDRANT_COLLECTION}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vectors: {
          size: EMBEDDING_DIMENSIONS,
          distance: "Cosine",
        },
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Qdrant collection setup failed: ${response.status} ${response.statusText} ${text}`,
    );
  }
}

async function getOllamaEmbeddings(
  texts: string[],
): Promise<EmbeddingBatchResult> {
  const response = await fetch(
    `${OLLAMA_BASE_URL.replace(/\/$/, "")}/api/embed`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: texts,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Ollama embedding request failed: ${response.status} ${response.statusText} ${text}`,
    );
  }

  const result = (await response.json()) as { embeddings?: number[][] };
  const rawEmbeddings = result.embeddings ?? [];

  if (!Array.isArray(rawEmbeddings) || rawEmbeddings.length !== texts.length) {
    throw new Error(
      `Ollama returned ${rawEmbeddings.length ?? 0} embeddings for ${texts.length} documents.`,
    );
  }

  return rawEmbeddings;
}

async function upsertVectorsToQdrant(points: QdrantPoint[]) {
  const response = await fetch(
    `${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points?wait=true`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        points,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Qdrant upsert failed: ${response.status} ${response.statusText} ${text}`,
    );
  }

  return await response.json();
}

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
    )) as EmbeddableDocument[];

    console.log(
      `[vectorEmbeddingsBackfill] Found ${documents.length} embeddable documents`,
    );

    let totalProcessed = 0;

    for (const batch of chunk(documents, batchSize)) {
      const embeddings = await step.run(
        `generate-embeddings-${batch[0].sourceId}`,
        async () => {
          return await getOllamaEmbeddings(batch.map((doc) => doc.text));
        },
      );

      const points: QdrantPoint[] = batch.map((doc, index) => {
        const embedding = embeddings[index];

        if (
          !Array.isArray(embedding) ||
          embedding.length !== EMBEDDING_DIMENSIONS
        ) {
          throw new Error(
            `Invalid embedding received for ${doc.sourceTable}:${doc.sourceId}`,
          );
        }

        return {
          id: uuidv5(`${doc.sourceTable}:${doc.sourceId}`, UUID_NAMESPACE),
          vector: embedding,
          payload: {
            sourceTable: doc.sourceTable,
            sourceId: doc.sourceId,
            entityType: doc.entityType,
            entityId: doc.entityId,
            text: doc.text,
            createdAt: doc.createdAt,
          },
        };
      });

      await step.run(`upsert-qdrant-${batch[0].sourceId}`, async () => {
        await upsertVectorsToQdrant(points);
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
