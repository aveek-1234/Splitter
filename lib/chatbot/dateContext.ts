export type DateContext = {
  date: string;
  label: string;
  month: string;
  timeZone: string;
};

export function getCurrentDateContext(date = new Date()): DateContext {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  return {
    date: date.toLocaleDateString("en-CA", { timeZone }),
    label: date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone,
    }),
    month: date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone,
    }),
    timeZone,
  };
}
