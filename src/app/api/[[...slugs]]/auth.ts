// this is an middleware to check whether user is authenticated or not or it is validated or not

import { redis } from "@/lib/redis";
import Elysia from "elysia";

class AuthError extends Error {
  constructor(messages: string) {
    super(messages);

    this.name = "AuthError";
  }
}

export const authMiddleware = new Elysia({
  name: "auth",
})
  .error({ AuthError })
  .onError(({ code, set }) => {
    if (code === "AuthError") {
      set.status = 401;
      return { error: "Unauthorized" };
    }
  })
  .derive({ as: "scoped" }, async ({ query, cookie }) => {
    // query for current room id and cookie for validate
    const roomId = query.roomId;
    const token = cookie["auth-token"].value as string | undefined;

    if (!roomId || !token) {
      throw new AuthError("Missing roomId or token.");
    }

    // const connected = await redis.hget<string[]>(`meta${roomId}`, "connected"); changed from chatgpt
    const connected = await redis.hget<string[]>(`meta:${roomId}`, "connected");


    if (!connected?.includes(token)) {
      throw new AuthError("Invalid token");
    }

    return { auth: { roomId, token, connected } };
  });
