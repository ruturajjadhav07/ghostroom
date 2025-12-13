import { InferRealtimeEvents, Realtime } from "@upstash/realtime";
import z from "zod/v4";
import { redis } from "@/lib/redis";

// 1 user sends message it should in realtime
// 2 and room to be destroyed

const messages = z.object({
  id: z.string(),
  sender: z.string(),
  text: z.string(),
  timestamp: z.number(),
  roomId: z.string(),
  token: z.string().optional(), // who send the message an user
});

const schema = {
  chat: {
    messages,

    // destroy everything
    destroy: z.object({
      isDestroyed: z.literal(true),
    }),
  },
};

export const realtime = new Realtime({ schema, redis });

export type RealtimeEvents = InferRealtimeEvents<typeof realtime>;

export type Messages = z.infer<typeof messages>;
