import { v } from "convex/values";
import { action } from "./_generated/server";
import { Resend } from "resend";

export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    text: v.optional(v.string()),

    attachments: v.optional(
      v.array(
        v.object({
          filename: v.string(),
          content: v.string(),
        }),
      ),
    ),
  },

  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.error("[sendEmail] RESEND_API_KEY is not set");

      return {
        success: false,
        error: "Missing API key",
      };
    }

    const resend = new Resend(apiKey);

    try {
      await resend.emails.send({
        from: "SplitterHub <noreply@splitterhub.cloud>",
        to: args.to,
        subject: args.subject,
        html: args.html,
        text: args.text,

        attachments: args.attachments?.map((attachment) => ({
          filename: attachment.filename,
          content: attachment.content,
        })),
      });

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
});
