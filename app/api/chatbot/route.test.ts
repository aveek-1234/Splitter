import { describe, expect, it } from "vitest";
import { buildChatMessages } from "./route";

describe("buildChatMessages", () => {
  it("includes current date context for relative questions", () => {
    const fixedDate = new Date("2026-07-04T12:00:00Z");
    const messages = buildChatMessages("What did I spend today?", { expenses: [] }, fixedDate);

    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("Current date context");
    expect(messages[1].content).toContain("What did I spend today?");
    expect(messages[1].content).toContain("2026-07-04");
  });
});
