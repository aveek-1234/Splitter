import { ChatOpenAI } from "@langchain/openai";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_MODEL = "llama-3.3-70b-versatile";

export function makeChatModel() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Missing environment variable: GROQ_API_KEY");
  }

  return new ChatOpenAI({
    model: GROQ_MODEL,
    apiKey,
    temperature: 0.2,
    configuration: {
      baseURL: GROQ_BASE_URL,
    },
  });
}
