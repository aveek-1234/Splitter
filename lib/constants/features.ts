import { Bell, Clock, CreditCard, PieChart, Receipt, Users } from "lucide-react";

export const FEATURES = [
  {
    title: "Group Expenses",
    Icon: Users,
    bg: "bg-blue-100",
    color: "text-blue-600",
    description:
      "Create groups for roommates, trips, or events to keep expenses organized.",
  },
  {
    title: "Smart Settlements",
    Icon: CreditCard,
    bg: "bg-teal-100",
    color: "text-teal-600",
    description:
      "Our algorithm minimises the number of payments when settling up.",
  },
  {
    title: "Expense Analytics",
    Icon: PieChart,
    bg: "bg-blue-100",
    color: "text-blue-600",
    description:
      "Track spending patterns and discover insights about your shared costs.",
  },
  {
    title: "Payment Reminders",
    Icon: Bell,
    bg: "bg-amber-100",
    color: "text-amber-600",
    description:
      "Automated reminders for pending debts and insights on spending patterns.",
  },
  {
    title: "Multiple Split Types",
    Icon: Receipt,
    bg: "bg-blue-100",
    color: "text-blue-600",
    description:
      "Split equally, by percentage, or by exact amounts to fit any scenario.",
  },
  {
    title: "Real‑time Updates",
    Icon: Clock,
    bg: "bg-blue-100",
    color: "text-blue-600",
    description:"See new expenses and repayments the moment your friends add them.",
  },
];