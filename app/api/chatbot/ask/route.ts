import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { askQuestion } from "@/lib/ai/rag";

export async function POST(request: Request) {
  const session = await auth();

  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { question?: string };

  try {
    body = (await request.json()) as { question?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";

  if (!question) {
    return NextResponse.json(
      { error: "Please provide a question about your expenses." },
      { status: 400 },
    );
  }

  try {
    const result = await askQuestion(question);

    return NextResponse.json({
      answer: result.answer,
      sources: result.sources.map((source) => ({
        score: source.score,
        payload: source.payload,
      })),
    });
  } catch (error) {
    console.error("Chatbot RAG error", error);

    return NextResponse.json(
      {
        answer:
          "I hit a temporary issue while checking your expenses. Please try again in a moment.",
        sources: [],
      },
      { status: 500 },
    );
  }
}
