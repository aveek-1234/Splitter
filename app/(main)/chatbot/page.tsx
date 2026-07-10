import { ExpenseChatbot } from "@/components/ExpenseChatbot";

export default function ChatbotPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-700">
          AI assistant
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Expenditure chatbot</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Ask questions about your spending, recent purchases, categories, and what still needs to be settled.
        </p>
      </div>

      <ExpenseChatbot />
    </div>
  );
}
