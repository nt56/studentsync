import api from "./api";
import type { AssistantReply, AssistantStatus } from "@/lib/contracts";

export interface AssistantMessageInput { role: "user" | "assistant"; text: string }

type Envelope<T> = { success: true; message: string; data: T };

/** Campus assistant. The interceptor unwraps axios, so calls resolve to the envelope. */
export const assistantService = {
  /** GET /api/assistant */
  status() {
    return api.get("/assistant") as unknown as Promise<Envelope<AssistantStatus>>;
  },

  /** POST /api/assistant */
  ask(body: { messages: AssistantMessageInput[]; eventId?: string; timeZone?: string }) {
    return api.post("/assistant", body, { timeout: 60_000 }) as unknown as Promise<Envelope<AssistantReply>>;
  },
};
