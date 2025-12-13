// this automatically handles messages reconnects and everything
import { handle } from "@upstash/realtime";
import { realtime } from "@/lib/realtime";

export const GET = handle({ realtime });
