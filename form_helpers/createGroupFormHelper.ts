import { z } from "zod/v3";

export const groupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long").max(100, "Name must be at most 100 characters long"),
  description: z.string().max(500, "Description must be at most 500 characters long").optional(),
});

export type GroupFormValues = z.infer<typeof groupSchema>;

export const defaultValues = {
  name: "",
  description: ""
}