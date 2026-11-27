import { z } from "zod";
import { validTimeZone } from "@/lib/event-time";
import { ASSISTANT_LIMITS } from "@/lib/contracts";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");

const userMessage = z.object({
  role: z.literal("user"),
  text: z.string().trim().min(1, "Message is empty").max(ASSISTANT_LIMITS.maxUserChars, `Keep messages under ${ASSISTANT_LIMITS.maxUserChars} characters`),
});
const assistantMessage = z.object({
  role: z.literal("assistant"),
  text: z.string().trim().min(1).max(ASSISTANT_LIMITS.maxAssistantChars),
});

/**
 * POST /api/assistant body. Nothing is stored: the client sends the visible
 * conversation (oldest first) and the newest message must be the user's.
 * `eventId` is the event page the user is on; `timeZone` is the browser's, for
 * "this weekend" style questions.
 */
export const assistantRequestSchema = z.object({
  messages: z.array(z.discriminatedUnion("role", [userMessage, assistantMessage]))
    .min(1)
    .max(ASSISTANT_LIMITS.maxMessages, "Conversation is too long. Start a new one.")
    .refine((messages) => messages.at(-1)?.role === "user", "The last message must be from the user"),
  eventId: objectId.optional(),
  timeZone: z.string().refine(validTimeZone, "Use a valid IANA timezone").optional(),
}).strict();

export type AssistantRequest = z.infer<typeof assistantRequestSchema>;
