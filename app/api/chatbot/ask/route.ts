import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { askExpenseAgent } from "@/lib/ai/agent";
import { createConvexClient } from "@/lib/chatbot/convexClient";
import { getCurrentDateContext } from "@/lib/chatbot/dateContext";

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
    const convexToken = await session.getToken({ template: "convex" });
    const convex = createConvexClient(convexToken);
    const dateContext = getCurrentDateContext();

    const result = await askExpenseAgent(question, convex, dateContext);

    return NextResponse.json({
      answer: result.answer,
      sources: result.sources.map((source) => ({
        score: source.score,
        payload: source.payload,
      })),
    });
  } catch (error) {
    console.error("Chatbot agent error", error);

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
