import { tool } from "@langchain/core/tools";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { searchRelatedDocuments } from "@/lib/ai/rag";
import type { RetrievedDocument } from "@/lib/ai/prompt";
import type { QdrantSearchResult } from "@/lib/ai/qdrant";

export type AgentSource = {
  score: number;
  payload: RetrievedDocument;
};

function toJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function makeExpenseTools(
  convex: ConvexHttpClient,
  sources: AgentSource[],
) {
  const getBalances = tool(
    async () => {
      const data = await convex.query(api.chatbot.getBalancesForCurrentUser);
      return toJson(data);
    },
    {
      name: "get_balances",
      description:
        "Get who owes the current user money and who the user still owes. Use for settle-up and balance questions.",
      schema: z.object({}),
    },
  );

  const getSpendingSummary = tool(
    async ({ month, category }) => {
      const data = await convex.query(
        api.chatbot.getSpendingSummaryForCurrentUser,
        {
          month: month || undefined,
          category: category || undefined,
        },
      );
      return toJson(data);
    },
    {
      name: "get_spending_summary",
      description:
        "Get spending totals, category totals, and balance overview. Optionally filter by month (YYYY-MM) and/or category.",
      schema: z.object({
        month: z
          .string()
          .optional()
          .describe("Optional month filter as YYYY-MM, e.g. 2026-08"),
        category: z
          .string()
          .optional()
          .describe("Optional expense category filter, e.g. food"),
      }),
    },
  );

  const listExpenses = tool(
    async ({ category, month, groupName, limit }) => {
      const data = await convex.query(api.chatbot.listExpensesForCurrentUser, {
        category: category || undefined,
        month: month || undefined,
        groupName: groupName || undefined,
        limit: limit ?? 50,
      });
      return toJson(data);
    },
    {
      name: "list_expenses",
      description:
        "List the user's expenses with optional filters for category, month (YYYY-MM), group name, and limit. Use for biggest expenses, category spend, or recent activity.",
      schema: z.object({
        category: z.string().optional().describe("Expense category filter"),
        month: z
          .string()
          .optional()
          .describe("Month filter as YYYY-MM, e.g. 2026-08"),
        groupName: z
          .string()
          .optional()
          .describe("Group name filter; use private/none for non-group expenses"),
        limit: z
          .number()
          .optional()
          .describe("Max expenses to return (default 50, max 100)"),
      }),
    },
  );

  const listSettlements = tool(
    async ({ month, limit }) => {
      const data = await convex.query(
        api.chatbot.listSettlementsForCurrentUser,
        {
          month: month || undefined,
          limit: limit ?? 50,
        },
      );
      return toJson(data);
    },
    {
      name: "list_settlements",
      description:
        "List recent settlements/repayments for the current user. Optionally filter by month (YYYY-MM).",
      schema: z.object({
        month: z
          .string()
          .optional()
          .describe("Month filter as YYYY-MM, e.g. 2026-08"),
        limit: z
          .number()
          .optional()
          .describe("Max settlements to return (default 50, max 100)"),
      }),
    },
  );

  const searchRelated = tool(
    async ({ question, limit }) => {
      try {
        const hits = await searchRelatedDocuments(question, limit ?? 5);
        for (const hit of hits) {
          sources.push({
            score: hit.score,
            payload: hit.payload,
          });
        }
        return toJson(
          hits.map((hit: QdrantSearchResult<RetrievedDocument>) => ({
            score: hit.score,
            payload: {
              sourceTable: hit.payload.sourceTable,
              sourceId: hit.payload.sourceId,
              entityType: hit.payload.entityType,
              text: hit.payload.text,
              createdAt: hit.payload.createdAt,
            },
          })),
        );
      } catch (error) {
        console.warn("search_related tool failed", error);
        return toJson({
          error: "Vector search unavailable right now.",
          results: [],
        });
      }
    },
    {
      name: "search_related",
      description:
        "Fuzzy search related expense, settlement, group, or user records when the user refers to something vaguely (for example a trip nickname or old description).",
      schema: z.object({
        question: z
          .string()
          .describe("Search query derived from the user question"),
        limit: z
          .number()
          .optional()
          .describe("Max related records to return (default 5)"),
      }),
    },
  );

  return [
    getBalances,
    getSpendingSummary,
    listExpenses,
    listSettlements,
    searchRelated,
  ];
}
