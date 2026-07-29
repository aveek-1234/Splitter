import { v5 as uuidv5 } from "uuid";

export const EMBEDDING_DIMENSIONS = 768;
export const UUID_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const QDRANT_URL = (process.env.QDRANT_URL ?? "http://localhost:6333").replace(
  /\/$/,
  "",
);
export const QDRANT_COLLECTION =
  process.env.QDRANT_COLLECTION ?? "splitter_embeddings";
const EMBEDDING_MODEL = process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";

export type EmbeddableDocument = {
  sourceTable: "users" | "groups" | "expenses" | "settlements";
  sourceId: string;
  entityType: string;
  entityId: string;
  text: string;
  createdAt: number;
};

export type QdrantPoint = {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
};

export function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }

  return result;
}

export function buildPointId(
  sourceTable: string,
  sourceId: string,
): string {
  return uuidv5(`${sourceTable}:${sourceId}`, UUID_NAMESPACE);
}

export function buildQdrantPoint(
  doc: EmbeddableDocument,
  embedding: number[],
): QdrantPoint {
  if (
    !Array.isArray(embedding) ||
    embedding.length !== EMBEDDING_DIMENSIONS
  ) {
    throw new Error(
      `Invalid embedding received for ${doc.sourceTable}:${doc.sourceId}`,
    );
  }

  return {
    id: buildPointId(doc.sourceTable, doc.sourceId),
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
}

export async function ensureQdrantCollection(): Promise<void> {
  const existingCollectionsResponse = await fetch(
    `${QDRANT_URL}/collections/${QDRANT_COLLECTION}`,
    {
      method: "GET",
    },
  );

  if (existingCollectionsResponse.ok) {
    return;
  }

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

export async function embedTexts(texts: string[]): Promise<number[][]> {
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

export async function upsertQdrantPoints(points: QdrantPoint[]): Promise<void> {
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
}

export async function deleteQdrantPoint(
  sourceTable: string,
  sourceId: string,
): Promise<void> {
  const id = buildPointId(sourceTable, sourceId);

  const response = await fetch(
    `${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/delete`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ids: [id],
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Qdrant delete failed: ${response.status} ${response.statusText} ${text}`,
    );
  }
}
