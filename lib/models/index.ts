import { Id } from "../../convex/_generated/dataModel";

// User Model
export interface User {
  _id: string;
  name: string;
  email: string;
  tokenId: string;
  imageUrl?: string;
}

// Split Object for Expenses
export interface Split {
  userId: string;
  amount: number;
  paid: boolean;
}

// Expense Model
export interface Expense {
  _id: string;
  description: string;
  amount: number;
  category?: string;
  date: number; // timestamp
  paidByUserId: string; // Reference to users table
  splitType: "equal" | "percentage" | "exact";
  splits: Split[];
  groupId?: string; // null for one-on-one expenses
  createdBy: string; // Reference to users table
}

// Settlement Model
export interface Settlement {
  _id: string;
  amount: number;
  note?: string;
  date: number; // timestamp
  paidByUserId: string; // Reference to users table
  receivedByUserId: string; // Reference to users table
  groupId?: string; // null for one-on-one settlements
  relatedExpenseIds?: string[]; // Which expenses this settlement covers
  createdBy: string; // Reference to users table
}

// Group Member Object
export interface GroupMember {
  userId: string;
  role: "admin" | "member";
  joinedAt: number;
}

// Group Model
export interface Group {
  _id: string;
  name: string;
  description?: string;
  createdBy: string; // Reference to users table
  members: GroupMember[];
}

// Type for API Responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Query Result Type
export interface QueryResult<T> {
  data: T;
  loading: boolean;
  error: Error | null;
}

/** User balance summary for one-on-one expenses */
export interface UserBalanceSummary {
  userId: string;
  name: string | undefined;
  email: string | undefined;
  imageUrl: string | undefined;
  netBalance: number;
}

/** Return type for getUserBalances */
export interface GetUserBalancesResult {
  userOwe: number;
  userIsOwed: number;
  owingDetails: {
    userOwe: UserBalanceSummary[];
    userIsOwed: UserBalanceSummary[];
  };
}

/** Return type for getTotalSpent */
export interface GetTotalSpentResult {
  totalSpent: number;
  monthlySpent: number[];
}

/** Other user details for one-on-one views */
export interface OtherUserDetails {
  id: string;
  name: string;
  email: string;
  imageUrl?: string;
}

/** Query result type for individual expenses page */
export type QueryData = {
  expensesWhereBothUserOrMeInvolved: Expense[];
  settlementsWhereBothInvolved: Settlement[];
  otherUserDetails: OtherUserDetails;
  balance: number;
};

/** Return type for getGroupExpenses (group with id and balance) */
export type GroupWithBalance = Group & { id: string; balance: number };

/** Member detail as returned in group expenses (id, name, email, imageUrl) */
export interface GroupMemberDetail {
  id: string;
  name: string;
  email: string;
  imageUrl?: string;
}

/** Group balance entry for a member (who they owe / who owes them) */
export interface GroupBalanceEntry {
  id: Id<"users">;
  name: string;
  email: string;
  imageUrl: string | undefined;
  totalOutstandingBalance: number;
  userOwe: { to: string; amount: number }[];
  userOwedBy: { from: string; amount: number }[];
}

/** Return type for getGroupExpenses (group details, members, expenses, settlements, balances) */
export interface GroupExpensesData {
  groupDetails: {
    id: string;
    name: string;
    description?: string;
  };
  members: (GroupMemberDetail | null)[];
  expenses: Expense[];
  settlements: Settlement[];
  groupBalances: GroupBalanceEntry[];
  userLookup: Record<string, GroupMemberDetail | null>;
}

export interface CreateGroupModalProps {
  isOpen: boolean
  onClose: (open: boolean) => void
  onSuccess: (groupId: string) => void
}
