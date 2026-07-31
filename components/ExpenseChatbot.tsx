"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useFetchQuery } from "@/hooks/useFetchQuery";
import { askChatQuestion } from "@/lib/chatbot/askQuestion";
import { format } from "date-fns";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Loader2,
  Send,
  Sparkles,
  Wallet,
} from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
};

const quickPrompts = [
  "Show me my biggest expenses this month",
  "How much did I spend on food?",
  "What do I still need to settle?",
  "Summarize my spending in the last 30 days",
];

const thinkingSteps = [
  "Reading your expense records",
  "Searching related transactions",
  "Calculating balances and totals",
  "Preparing your answer",
];

function AssistantThinkingBubble() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % thinkingSteps.length);
    }, 2200);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="max-w-[90%] animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-slate-50 via-white to-blue-50 px-4 py-4 shadow-sm">
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-100/60 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-6 h-20 w-20 rounded-full bg-indigo-100/50 blur-2xl" />

        <div className="relative flex items-start gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-200">
            <Bot className="h-5 w-5" />
            <span className="absolute inset-0 rounded-full border-2 border-blue-300/70 animate-ping" />
            <span className="absolute inset-0 rounded-full border border-blue-400/40 animate-pulse" />
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-800">Expense Assistant</p>
              <span className="flex gap-1">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce"
                    style={{ animationDelay: `${dot * 150}ms` }}
                  />
                ))}
              </span>
            </div>

            <p className="text-sm text-slate-600 transition-all duration-500">
              {thinkingSteps[stepIndex]}
            </p>

            <div className="space-y-2">
              <div className="flex h-2.5 gap-1">
                {[0, 1, 2, 3, 4].map((bar) => (
                  <div
                    key={bar}
                    className="h-full flex-1 rounded-full bg-blue-400/35 animate-pulse"
                    style={{ animationDelay: `${bar * 120}ms` }}
                  />
                ))}
              </div>
              <div className="grid gap-2">
                <div className="h-2.5 w-[92%] rounded-full bg-slate-100 animate-pulse" />
                <div className="h-2.5 w-[76%] rounded-full bg-slate-100 animate-pulse [animation-delay:150ms]" />
                <div className="h-2.5 w-[64%] rounded-full bg-slate-100 animate-pulse [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContextLoadingBubble() {
  return (
    <div className="max-w-[90%] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <p className="text-sm text-slate-600">Loading your expense snapshot...</p>
      </div>
    </div>
  );
}

export function ExpenseChatbot() {
  const { data: context, loading } = useFetchQuery<any>(api.chatbot.getExpenseChatContext);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I can help you review your spending, find recent transactions, and tell you what you still need to settle.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const summary = context?.summary ?? {
    totalSpent: 0,
    totalPaidByMe: 0,
    totalOwedByMe: 0,
    totalOwedToMe: 0,
    categoryTotals: {},
  };

  const expenses = context?.expenses ?? [];

  const recentExpenses = [...expenses]
    .sort((a, b) => b.date - a.date)
    .slice(0, 5);

  const topCategories = (
    Object.entries(summary.categoryTotals ?? {}) as [string, number][]
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || isSending) {
      return;
    }

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setIsSending(true);

    try {
      const result = await askChatQuestion(trimmed);

      const sourceLabels = result.sources
        .map((source) => source.payload.text)
        .filter((text): text is string => typeof text === "string" && text.length > 0)
        .slice(0, 3);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            result.answer || "I couldn't generate an answer for that question.",
          sources: sourceLabels.length > 0 ? sourceLabels : undefined,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I hit a temporary issue while checking your expenses. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <Card className="flex h-[72vh] flex-col overflow-hidden">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Bot className="h-5 w-5 text-blue-600" />
            Expense Assistant
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Ask about totals, categories, recent purchases, or what you still need to settle.
          </p>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[90%] rounded-2xl px-4 py-3 ${
                  message.role === "assistant"
                    ? "bg-slate-100 text-slate-900"
                    : "ml-auto bg-blue-600 text-white"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-6">
                  {message.content}
                </p>
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2 border-t border-slate-200 pt-2">
                    <p className="text-xs font-medium text-slate-500">Matched records</p>
                    <ul className="mt-1 space-y-1">
                      {message.sources.map((source, sourceIndex) => (
                        <li key={sourceIndex} className="text-xs text-slate-600">
                          {source}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}

            {isSending && <AssistantThinkingBubble />}

            {loading && <ContextLoadingBubble />}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-3 border-t pt-4">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={2}
              placeholder="Ask for spending details..."
              className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none ring-0 transition focus:border-blue-500"
              disabled={isSending}
            />
            <Button type="submit" disabled={isSending} className="self-end min-w-[104px]">
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Thinking
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-blue-600" />
              {context?.user?.name || "Your"} spending snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-slate-50 p-3">
                <p className="text-sm text-muted-foreground">Total spent</p>
                <p className="mt-2 text-2xl font-bold">₹{summary.totalSpent.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border bg-slate-50 p-3">
                <p className="text-sm text-muted-foreground">Paid by you</p>
                <p className="mt-2 text-2xl font-bold">₹{summary.totalPaidByMe.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border bg-slate-50 p-3">
                <p className="text-sm text-muted-foreground">Still to settle</p>
                <p className="mt-2 text-2xl font-bold flex items-center gap-2 text-red-600">
                  <ArrowDownRight className="h-4 w-4" />
                  ₹{summary.totalOwedByMe.toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl border bg-slate-50 p-3">
                <p className="text-sm text-muted-foreground">You should receive</p>
                <p className="mt-2 text-2xl font-bold flex items-center gap-2 text-green-600">
                  <ArrowUpRight className="h-4 w-4" />
                  ₹{summary.totalOwedToMe.toFixed(2)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-700">Top categories</p>
              <div className="mt-2 space-y-2">
                {topCategories.length > 0 ? (
                  topCategories.map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm">{category}</span>
                      <span className="text-sm font-medium">₹{Number(amount).toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No category data available yet.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4 text-blue-600" />
              Recent expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentExpenses.length > 0 ? (
              recentExpenses.map((expense) => (
                <div key={expense.id} className="rounded-xl border px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {expense.groupName ? `${expense.groupName} • ` : ""}
                        {format(new Date(expense.date), "MMM d, yyyy")}
                      </p>
                    </div>
                    <span className="text-sm font-semibold">₹{expense.amount.toFixed(2)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No expense records to inspect yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Try asking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickPrompts.map((prompt) => (
              <Button
                key={prompt}
                variant="outline"
                className="w-full justify-start text-left"
                onClick={() => setInput(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
