/**
/**
 * Expense categories for the app, each with a label, value, and Lucide icon.
 * Each category can be used as a choice when creating an expense.
 */

import {
  Utensils,
  Car,
  Home,
  Bus,
  ShoppingCart,
  Film,
  Heart,
  Wifi,
  Dumbbell,
  Beer,
  BookOpen,
  PiggyBank,
  DollarSign,
  Gift,
  Wrench,
  Globe,
  Music,
  Palette,
  Coffee,
  Smartphone,
  Users
} from "lucide-react";

export type ExpenseCategory = {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
};

// Add, remove, or modify as needed for your app
export const expenseCategories: ExpenseCategory[] = [
  {
    label: "Food & Dining",
    value: "food",
    icon: Utensils,
  },
  {
    label: "Transport",
    value: "transport",
    icon: Car,
  },
  {
    label: "Home",
    value: "home",
    icon: Home,
  },
  {
    label: "Public Transit",
    value: "public_transit",
    icon: Bus,
  },
  {
    label: "Groceries",
    value: "groceries",
    icon: ShoppingCart,
  },
  {
    label: "Entertainment",
    value: "entertainment",
    icon: Film,
  },
  {
    label: "Health",
    value: "health",
    icon: Heart,
  },
  {
    label: "Utilities",
    value: "utilities",
    icon: Wifi,
  },
  {
    label: "Fitness",
    value: "fitness",
    icon: Dumbbell,
  },
  {
    label: "Drinks",
    value: "drinks",
    icon: Beer,
  },
  {
    label: "Education",
    value: "education",
    icon: BookOpen,
  },
  {
    label: "Savings",
    value: "savings",
    icon: PiggyBank,
  },
  {
    label: "Cash",
    value: "cash",
    icon: DollarSign,
  },
  {
    label: "Gifts",
    value: "gifts",
    icon: Gift,
  },
  {
    label: "Repairs",
    value: "repairs",
    icon: Wrench,
  },
  {
    label: "Travel",
    value: "travel",
    icon: Globe,
  },
  {
    label: "Music",
    value: "music",
    icon: Music,
  },
  {
    label: "Arts & Crafts",
    value: "arts",
    icon: Palette,
  },
  {
    label: "Coffee",
    value: "coffee",
    icon: Coffee,
  },
  {
    label: "Phone",
    value: "phone",
    icon: Smartphone,
  },
  {
    label: "Other",
    value: "other",
    icon: Users,
  }
];

// Helper to get category by value
export function getCategoryById(id?: string) {
  return expenseCategories.find((cat) => cat.value === id);
}

import React from "react";

export function getCategoryIconById(id?: string) {
  const category = getCategoryById(id);
  return category?.icon;
}


