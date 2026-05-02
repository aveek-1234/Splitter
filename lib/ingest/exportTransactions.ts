import { inngest } from "./client";

export const exportTransactions = inngest.createFunction(
  { id: "export-transactions" },
  { event: "transactions/export" },

  async ({ event }) => {
    const { transactions, email } = event.data;

    console.log(transactions);

    // generate pdf
    // send email
  },
);
