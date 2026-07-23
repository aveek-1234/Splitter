import OpenAI from "openai";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_MODEL = "llama-3.3-70b-versatile";

if (!GROQ_API_KEY) {
  throw new Error("Missing environment variable: GROQ_API_KEY");
}

const groqClient = new OpenAI({
  apiKey: GROQ_API_KEY,
  baseURL: GROQ_BASE_URL,
});

export async function generateAnswer(prompt: string): Promise<string> {
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    throw new Error("generateAnswer requires a non-empty prompt.");
  }

  const response = await groqClient.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant that answers only from provided context. Do not invent facts.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.2,
    max_tokens: 1024,
  });

  const generatedText = response.choices?.[0]?.message?.content;

  if (!generatedText || typeof generatedText !== "string") {
    throw new Error("Groq returned an empty or invalid completion response.");
  }

  return generatedText.trim();
}
