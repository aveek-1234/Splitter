import { NextResponse } from "next/server";
import OpenAI from "openai";

function getGroq() {
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

function getCurrentDateContext(date = new Date()) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  return {
    date: date.toLocaleDateString("en-CA", { timeZone }),
    label: date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone,
    }),
    month: date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone,
    }),
    timeZone,
  };
}

export function buildChatMessages(
  query: string,
  context: unknown,
  date = new Date(),
) {
  const currentDateContext = getCurrentDateContext(date);

  return [
    {
      role: "system" as const,
      content: `You are Splitter's expense assistant. Answer only using the provided expense context. If the user asks for a number, calculate it from the context. If the data does not contain the answer, say so clearly. Keep the tone friendly and practical. When the user asks about relative dates like today, this week, this month, yesterday, last month, or similar phrases, use the current date context provided below. Current date context: ${JSON.stringify(currentDateContext)}.`,
    },
    {
      role: "user" as const,
      content: `User question: ${query}\n\nCurrent date context:\n${JSON.stringify(currentDateContext, null, 2)}\n\nExpense context:\n${JSON.stringify(context, null, 2)}`,
    },
  ];
}

export async function POST(request: Request) {
  const groq = getGroq();
  try {
    const body = (await request.json()) as {
      query?: string;
      context?: unknown;
    };

    const query = typeof body.query === "string" ? body.query.trim() : "";
    const context = body.context ?? {};

    if (!query) {
      return NextResponse.json(
        { error: "Please provide a question about your expenses." },
        { status: 400 },
      );
    }

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: buildChatMessages(query, context),
      temperature: 0.2,
    });

    const answer = response.choices?.[0]?.message?.content?.trim();

    return NextResponse.json({
      answer: answer || "I couldn't generate an answer right now.",
    });
  } catch (error) {
    console.error("Chatbot route error", error);

    return NextResponse.json(
      {
        answer:
          "I hit a temporary issue while pulling your expense details. Please try again in a moment.",
      },
      { status: 200 },
    );
  }
}
