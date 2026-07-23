const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL;
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL;

if (!OLLAMA_BASE_URL) {
  throw new Error("Missing environment variable: OLLAMA_BASE_URL");
}

if (!OLLAMA_EMBED_MODEL) {
  throw new Error("Missing environment variable: OLLAMA_EMBED_MODEL");
}

const normalizedOllamaUrl = OLLAMA_BASE_URL.replace(/\/+$/, "");

export async function embedText(text: string): Promise<number[]> {
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new Error("embedText requires a non-empty text string.");
  }

  const response = await fetch(`${normalizedOllamaUrl}/api/embed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OLLAMA_EMBED_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Ollama embedding request failed: ${response.status} ${response.statusText} ${responseText}`,
    );
  }

  const payload = (await response.json()) as {
    embedding?: number[];
    embeddings?: number[];
    error?: string;
  };

  const embedding =
    Array.isArray(payload.embedding) && payload.embedding.length > 0
      ? payload.embedding
      : Array.isArray(payload.embeddings) && payload.embeddings.length > 0
        ? payload.embeddings
        : undefined;

  if (!embedding || !Array.isArray(embedding)) {
    throw new Error(
      `Ollama returned an invalid embedding payload. Response: ${JSON.stringify(
        payload,
      )}`,
    );
  }

  return embedding;
}
