import { ConvexHttpClient } from "convex/browser";

import { inngest } from "./client";

import { api } from "@/convex/_generated/api";
import PDFDocument from "pdfkit";

import path from "path";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const exportTransactions = inngest.createFunction(
  {
    id: "export-transactions",
  },

  {
    event: "transactions/export",
  },

  async ({ event }) => {
    try {
      const { transactions, email } = event.data;

      console.log("Generating PDF...");

      // ------------------------
      // GENERATE PDF
      // ------------------------

      const pdfBase64 = await generateTransactionsPdf(transactions);

      console.log("PDF generated");

      // ------------------------
      // SEND EMAIL
      // ------------------------

      const result = await convex.action(api.sendEmail.sendEmail, {
        to: email,

        subject: "Your Transaction Export",

        html: `
            <div>
              <h1>Transaction Export</h1>

              <p>
                Please find your exported transactions attached.
              </p>
            </div>
          `,

        text: "Your transaction export is attached.",

        attachments: [
          {
            filename: "transactions.pdf",
            content: pdfBase64,
          },
        ],
      });

      console.log(result);

      return {
        success: true,
      };
    } catch (error) {
      console.error(error);

      return {
        success: false,
      };
    }
  },
);

async function generateTransactionsPdf(transactions: any[]) {
  return new Promise<string>((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
    });

    const buffers: Buffer[] = [];

    doc.font(path.join(process.cwd(), "public/fonts/Roboto-Regular.ttf"));

    doc.on("data", (chunk) => {
      buffers.push(chunk);
    });

    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(buffers);

      resolve(pdfBuffer.toString("base64"));
    });

    doc.on("error", reject);

    // ------------------------
    // HEADER
    // ------------------------

    doc.fontSize(24).text("SplitterHub Transaction Export", {
      align: "center",
    });

    doc.moveDown();

    doc.fontSize(12).text(`Generated At: ${new Date().toLocaleString()}`);

    doc.moveDown(2);

    // ------------------------
    // TRANSACTIONS
    // ------------------------

    transactions.forEach((transaction, index) => {
      doc.fontSize(16).text(`${index + 1}. ${transaction.displayText}`);

      doc.moveDown(0.5);

      doc.fontSize(12);

      doc.text(`Type: ${transaction.typeOfTransaction}`);

      doc.text(`Amount: ₹${transaction.amount}`);

      doc.text(`Name: ${transaction.name}`);

      doc.text(`Date: ${new Date(transaction.date).toLocaleDateString()}`);

      if (transaction.description) {
        doc.text(`Description: ${transaction.description}`);
      }

      if (transaction.note) {
        doc.text(`Note: ${transaction.note}`);
      }

      doc.moveDown();

      doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();

      doc.moveDown();
    });

    doc.end();
  });
}
