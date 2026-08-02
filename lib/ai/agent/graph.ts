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
import { makeChatModel } from "./model";
import { buildAgentSystemPrompt } from "./prompts";
import { makeExpenseTools, type AgentSource } from "./tools";

export type ExpenseAgentResult = {
  answer: string;
  sources: AgentSource[];
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

    const result = await graph.invoke({
      messages: [
        new SystemMessage(buildAgentSystemPrompt(dateContext)),
        new HumanMessage(question),
      ],
    });

    const messages = result.messages as BaseMessage[];
    const lastAiMessage = [...messages]
      .reverse()
      .find((message) => AIMessage.isInstance(message));

    const answer =
      (lastAiMessage && messageText(lastAiMessage)) ||
      "I couldn't generate an answer right now.";

    return {
      answer,
      sources: [...sources],
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
