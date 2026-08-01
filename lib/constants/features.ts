import { Bell, Clock, CreditCard, PieChart, Receipt, Users } from "lucide-react";

export const FEATURES = [
  {
    title: "Group Expenses",
    Icon: Users,
    bg: "bg-blue-100",
    color: "text-blue-600",
    description:
      "Create groups for roommates, trips, or events and keep every shared bill organized.",
  },
  {
    title: "Smart Settlements",
    Icon: CreditCard,
    bg: "bg-teal-100",
    color: "text-teal-600",
    description:
      "Minimize the number of payments when you settle up so everyone gets paid back faster.",
  },
  {
    title: "Expense Analytics",
    Icon: PieChart,
    bg: "bg-blue-100",
    color: "text-blue-600",
    description:
      "Track spending patterns and see insights about your shared costs over time.",
  },
  {
    title: "Payment Reminders",
    Icon: Bell,
    bg: "bg-amber-100",
    color: "text-amber-600",
    description:
      "Get automated reminders for pending debts so shared balances do not linger.",
  },
  {
    title: "Multiple Split Types",
    Icon: Receipt,
    bg: "bg-blue-100",
    color: "text-blue-600",
    description:
      "Split equally, by percentage, or by exact amounts to fit rent, trips, and dinners.",
  },
  {
    title: "Real-time Updates",
    Icon: Clock,
    bg: "bg-blue-100",
    color: "text-blue-600",
    description:
      "See new expenses and repayments the moment your friends add them.",
  },
];