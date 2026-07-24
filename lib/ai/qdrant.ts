export interface QdrantSearchResult<TPayload = Record<string, unknown>> {
  score: number;
  payload: TPayload;
}

export interface QdrantPoint<TPayload = Record<string, unknown>> {
  id: string;
  vector: number[];
  payload: TPayload;
}

const QDRANT_URL = (process.env.QDRANT_URL ?? "http://localhost:6333").replace(
  /\/$/,
  "",
);
const QDRANT_COLLECTION =
  process.env.QDRANT_COLLECTION ?? "splitter_embeddings";

if (!QDRANT_URL) {
  throw new Error("Missing environment variable: QDRANT_URL");
}

if (!QDRANT_COLLECTION) {
  throw new Error("Missing environment variable: QDRANT_COLLECTION");
}

const normalizedQdrantUrl = QDRANT_URL.replace(/\/+$/, "");

async function handleResponse(response: Response) {
  if (response.ok) {
    return response.json();
  }

  const responseText = await response.text();
  throw new Error(
    `Qdrant request failed: ${response.status} ${response.statusText} ${responseText}`,
  );
}

export async function ensureCollection(): Promise<void> {
  const response = await fetch(
    `${normalizedQdrantUrl}/collections/${encodeURIComponent(
      QDRANT_COLLECTION,
    )}`,
    {
      method: "GET",
    },
  );

  if (response.ok) {
    return;
  }

  await handleResponse(
    await fetch(
      `${normalizedQdrantUrl}/collections/${encodeURIComponent(
        QDRANT_COLLECTION,
      )}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vectors: {
            size: 1536,
            distance: "Cosine",
          },
        }),
      },
    ),
  );
}

export async function searchVectors<TPayload = Record<string, unknown>>(
  queryVector: number[],
  limit = 5,
): Promise<QdrantSearchResult<TPayload>[]> {
  if (!Array.isArray(queryVector) || queryVector.length === 0) {
    throw new Error("searchVectors requires a non-empty query vector.");
  }

  const response = await fetch(
    `${normalizedQdrantUrl}/collections/${encodeURIComponent(
      QDRANT_COLLECTION,
    )}/points/search`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vector: queryVector,
        limit,
        with_payload: true,
      }),
    },
  );

  const result = (await handleResponse(response)) as {
    result?: Array<{ score: number; payload?: TPayload }>;
  };

  const rawResults = result.result ?? [];

  return rawResults.map((item) => ({
    score: item.score,
    payload: item.payload ?? ({} as TPayload),
  }));
}

export async function upsertVectors<TPayload = Record<string, unknown>>(
  points: QdrantPoint<TPayload>[],
): Promise<void> {
  if (!Array.isArray(points) || points.length === 0) {
    throw new Error("upsertVectors requires a non-empty points array.");
  }

  await handleResponse(
    await fetch(
      `${normalizedQdrantUrl}/collections/${encodeURIComponent(
        QDRANT_COLLECTION,
      )}/points?wait=true`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          points,
        }),
      },
    ),
  );
}

export async function deletePoint(id: string): Promise<void> {
  if (!id || typeof id !== "string") {
    throw new Error("deletePoint requires a valid point id.");
  }

  await handleResponse(
    await fetch(
      `${normalizedQdrantUrl}/collections/${encodeURIComponent(
        QDRANT_COLLECTION,
      )}/points/delete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: [id],
        }),
      },
    ),
  );
}
