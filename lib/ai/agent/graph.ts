import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { ConvexHttpClient } from "convex/browser";
import type { DateContext } from "@/lib/chatbot/dateContext";
import { ensureLangSmithForNextRoute } from "./langsmith";
import { makeChatModel } from "./model";
import { buildAgentSystemPrompt } from "./prompts";
import { makeExpenseTools, type AgentSource } from "./tools";

export type ExpenseAgentResult = {
  answer: string;
  sources: AgentSource[];
  toolsUsed: string[];
  ragUsed: boolean;
};

function messageText(message: BaseMessage): string {
  const content = message.content;
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (
          part &&
          typeof part === "object" &&
          "text" in part &&
          typeof part.text === "string"
        ) {
          return part.text;
        }
        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

function collectToolsUsed(messages: BaseMessage[]): string[] {
  const toolsUsed: string[] = [];

  for (const message of messages) {
    if (!AIMessage.isInstance(message) || !message.tool_calls?.length) {
      continue;
    }

    for (const toolCall of message.tool_calls) {
      if (toolCall.name) {
        toolsUsed.push(toolCall.name);
      }
    }
  }

  return toolsUsed;
}

export function makeExpenseAgent(
  convex: ConvexHttpClient,
  dateContext: DateContext,
) {
  const sources: AgentSource[] = [];
  const tools = makeExpenseTools(convex, sources);
  const model = makeChatModel().bindTools(tools);
  const toolNode = new ToolNode(tools);

  async function agentNode(state: typeof MessagesAnnotation.State) {
    const response = await model.invoke(state.messages);
    return { messages: [response] };
  }

  const graph = new StateGraph(MessagesAnnotation)
    .addNode("agent", agentNode)
    .addNode("tools", toolNode)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", toolsCondition, ["tools", END])
    .addEdge("tools", "agent")
    .compile();

  async function ask(question: string): Promise<ExpenseAgentResult> {
    sources.length = 0;

    const { tracingEnabled, project } = ensureLangSmithForNextRoute();

    const result = await graph.invoke(
      {
        messages: [
          new SystemMessage(buildAgentSystemPrompt(dateContext)),
          new HumanMessage(question),
        ],
      },
      {
        runName: "expense-chat-agent",
        tags: ["splitter", "chatbot", "langgraph"],
        metadata: {
          feature: "expense-chatbot",
          langsmithProject: project,
          langsmithTracing: tracingEnabled,
          date: dateContext.date,
          month: dateContext.month,
        },
      },
    );

    const messages = result.messages as BaseMessage[];
    const toolsUsed = collectToolsUsed(messages);
    const ragUsed =
      toolsUsed.includes("search_related") || sources.length > 0;

    const lastAiMessage = [...messages]
      .reverse()
      .find((message) => AIMessage.isInstance(message));

    const answer =
      (lastAiMessage && messageText(lastAiMessage)) ||
      "I couldn't generate an answer right now.";

    if (process.env.NODE_ENV === "development") {
      console.info("[expense-agent]", {
        toolsUsed,
        ragUsed,
        sourceCount: sources.length,
        langsmithTracing: tracingEnabled,
      });
    }

    return {
      answer,
      sources: [...sources],
      toolsUsed,
      ragUsed,
    };
  }

  return { ask };
}

export async function askExpenseAgent(
  question: string,
  convex: ConvexHttpClient,
  dateContext: DateContext,
): Promise<ExpenseAgentResult> {
  if (typeof question !== "string" || question.trim().length === 0) {
    throw new Error("askExpenseAgent requires a non-empty question.");
  }

  const agent = makeExpenseAgent(convex, dateContext);
  return agent.ask(question.trim());
}
