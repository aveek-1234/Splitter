/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as contacts from "../contacts.js";
import type * as createExpense from "../createExpense.js";
import type * as dashboard from "../dashboard.js";
import type * as groupExpenses from "../groupExpenses.js";
import type * as individualExpenses from "../individualExpenses.js";
import type * as inngest from "../inngest.js";
import type * as seed from "../seed.js";
import type * as sendEmail from "../sendEmail.js";
import type * as settlement from "../settlement.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  contacts: typeof contacts;
  createExpense: typeof createExpense;
  dashboard: typeof dashboard;
  groupExpenses: typeof groupExpenses;
  individualExpenses: typeof individualExpenses;
  inngest: typeof inngest;
  seed: typeof seed;
  sendEmail: typeof sendEmail;
  settlement: typeof settlement;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
