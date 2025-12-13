import { redis } from "@/lib/redis";
import { Elysia } from "elysia";
import { nanoid } from "nanoid";
import { z } from "zod";
import { authMiddleware } from "./auth";
import { Messages, realtime } from "@/lib/realtime";

const Room_Ttl_Seconds = 60 * 10;

const rooms = new Elysia({ prefix: "/room" })
  .post("/create", async () => {
    const roomId = nanoid();

    // connected is typed to check which user are currently connected and date to check when this room is going to expire
    await redis.hset(`meta:${roomId}`, {
      connected: [],
      createdAt: Date.now(),
    });

    // self desctruction
    await redis.expire(`meta:${roomId}`, Room_Ttl_Seconds);

    return { roomId };
  })
  .use(authMiddleware)
  .get(
    "/ttl",
    async ({ auth }) => {
      const ttl = await redis.ttl(`meta:${auth.roomId}`);
      return { ttl: ttl > 0 ? ttl : 0 };
    },
    { query: z.object({ roomId: z.string() }) }
  )
  .delete(
    "/",
    async ({ auth }) => {
      // destroying data with all history
      await realtime
        .channel(auth.roomId)
        .emit("chat.destroy", { isDestroyed: true });
        
      await Promise.all([
        await redis.del(auth.roomId),
        await redis.del(`meta:${auth.roomId}`),
        await redis.del(`messages:${auth.roomId}`),
      ]);
    },
    { query: z.object({ roomId: z.string() }) }
  );

// api end point or sending messages
const messages = new Elysia({ prefix: "/messages" })
  .use(authMiddleware)
  .post(
    "/",
    async ({ body, auth }) => {
      const { sender, text } = body;
      const { roomId } = auth;
      // check room is existed where user try to message
      const roomExist = await redis.exists(`meta:${roomId}`);

      if (!roomExist) {
        throw new Error("Room does not exist");
      }

      // creating message to send to other users
      const messages: Messages = {
        id: nanoid(),
        sender,
        text,
        timestamp: Date.now(),
        roomId,
      };

      // message history
      await redis.rpush(`messages:${roomId}`, {
        ...messages,
        token: auth.token,
      });
      await realtime.channel(roomId).emit("chat.messages", messages);

      // expiry time (self destruction)
      const remaining = await redis.ttl(`meta:${roomId}`); // ttl is time to leave

      // expire history of roomId
      await redis.expire(`history:${roomId}`, remaining);

      // expire roomId itself
      await redis.expire(roomId, remaining);
    },
    {
      // zod is used to precess request if reuest doent match the certain things it will reject eg roomId
      query: z.object({ roomId: z.string() }),
      body: z.object({
        sender: z.string().max(100),
        text: z.string().max(1000),
      }),
    }
  )
  .get(
    "/",
    async ({ auth }) => {
      // auth middleware will run always to fetch message
      const messages = await redis.lrange<Messages>(
        `messages:${auth.roomId}`,
        0,
        -1
      );

      return {
        messages: messages.map((m) => ({
          ...m,
          token: m.token === auth.token ? auth.token : undefined,
        })),
      }; // to check that token is passed by person who sends message(token belongs strictly to sender )
    },
    { query: z.object({ roomId: z.string() }) }
  );

const app = new Elysia({ prefix: "/api" }).use(rooms).use(messages);

export const GET = app.fetch;
export const POST = app.fetch;
export const DELETE = app.fetch;

export type App = typeof app;
