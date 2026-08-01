import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { inngest } from "@/lib/ingest/client";

type QueueEmbeddingBody = {
  action?: "upsert" | "delete";
  sourceTable?: "expenses" | "settlements";
  sourceId?: string;
};

export async function POST(request: Request) {
  const session = await auth();

  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: QueueEmbeddingBody;

  try {
    body = (await request.json()) as QueueEmbeddingBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { action, sourceTable, sourceId } = body;

  if (!action || !sourceTable || !sourceId) {
    return NextResponse.json(
      { error: "action, sourceTable, and sourceId are required" },
      { status: 400 },
    );
  }

  if (action !== "upsert" && action !== "delete") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (
    sourceTable !== "expenses" &&
    sourceTable !== "settlements"
  ) {
    return NextResponse.json({ error: "Invalid sourceTable" }, { status: 400 });
  }

  if (action === "delete" && sourceTable !== "expenses") {
    return NextResponse.json(
      { error: "Only expenses can be deleted from embeddings" },
      { status: 400 },
    );
  }

  try {
    if (action === "upsert") {
      await inngest.send({
        name: "vector.embeddings.upsert",
        data: { sourceTable, sourceId },
      });
    } else {
      await inngest.send({
        name: "vector.embeddings.delete",
        data: { sourceTable: "expenses", sourceId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to queue embedding job", error);
    return NextResponse.json(
      { error: "Failed to queue embedding job" },
      { status: 500 },
    );
  }
}
