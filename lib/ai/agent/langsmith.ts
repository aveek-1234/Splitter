/**
 * LangSmith tracing is enabled via environment variables.
 * With @langchain/* installed, graph.invoke() is traced automatically when:
 *   LANGSMITH_TRACING=true
 *   LANGSMITH_API_KEY=...
 *   LANGSMITH_PROJECT=splitter-chatbot (optional)
 *
 * For Next.js API routes, keep background callbacks off so traces flush
 * before the response ends.
 */
export function ensureLangSmithForNextRoute(): {
  tracingEnabled: boolean;
  project: string;
} {
  if (process.env.LANGCHAIN_CALLBACKS_BACKGROUND === undefined) {
    process.env.LANGCHAIN_CALLBACKS_BACKGROUND = "false";
  }

  const tracingEnabled =
    process.env.LANGSMITH_TRACING === "true" ||
    process.env.LANGCHAIN_TRACING_V2 === "true";

  const project =
    process.env.LANGSMITH_PROJECT ||
    process.env.LANGCHAIN_PROJECT ||
    "splitter-chatbot";

  return { tracingEnabled, project };
}
