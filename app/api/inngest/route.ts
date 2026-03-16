import { serve } from "inngest/next";
import { inngest } from "@/lib/ingest/client";
import { paymentReminders } from "@/lib/ingest/paymentReminders";

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    /* your functions will be passed here later! */
    paymentReminders,
  ],
});