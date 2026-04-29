import { v } from "convex/values";
import { action } from "./_generated/server";
import { Resend } from "resend";

export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    text: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("[sendEmail] RESEND_API_KEY is not set");
      return { success: false, error: "Missing API key" };
    }
    
    const resend = new Resend(apiKey);
    console.log(
      `[sendEmail] Sending email to: ${args.to} with subject: ${args.subject}`,
    );
    try {
      await resend.emails.send({
        from: "SplitterHub <noreply@splitterhub.cloud>",
        to: args.to,
        // to:"aveekkarmakar28@gmail.com",
        subject: args.subject,
        html: args.html,
        text: args.text,
      });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },
});
