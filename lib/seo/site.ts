export const SITE_NAME = "SplitterHub";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://splitterhub.cloud";

export const SITE_DESCRIPTION =
  "Split bills, track shared expenses, and settle up with friends, roommates, and groups—fast and fair.";

export const SITE_TAGLINE = "Split expenses with friends";

export const HOME_TITLE = `${SITE_NAME} – ${SITE_TAGLINE}`;

export const FAQ_ITEMS = [
  {
    question: "How does SplitterHub split expenses?",
    answer:
      "Add a shared bill, choose who participated, and pick how to split—equally, by percentage, or by exact amounts. SplitterHub calculates each person’s share automatically.",
  },
  {
    question: "Can I split expenses with roommates or trip groups?",
    answer:
      "Yes. Create groups for roommates, trips, events, or colleagues, invite members, and keep every shared expense organized in one place.",
  },
  {
    question: "How do settlements and settling up work?",
    answer:
      "SplitterHub shows who owes whom and suggests smart settlements that minimize the number of payments so everyone can settle up quickly.",
  },
  {
    question: "Is SplitterHub free to use?",
    answer:
      "SplitterHub is free to get started for splitting bills, tracking balances, and settling shared expenses with your groups.",
  },
] as const;
