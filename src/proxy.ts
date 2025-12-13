import { NextRequest, NextResponse } from "next/server";
import { redis } from "./lib/redis";
import { nanoid } from "nanoid";

export const proxy = async (req: NextRequest) => {
  // checking user is allowed to join the room or not
  // if they are allow them else send back to lobby

  const pathname = req.nextUrl.pathname;

  // localhost:3000/room/myroom122323
  const roomMatch = pathname.match(/^\/room\/([^/]+)$/);
  if (!roomMatch) return NextResponse.redirect(new URL("/", req.url));

  const roomId = roomMatch[1]; // extract room id

  const meta = await redis.hgetall<{ connected: string[]; createdAt: number }>(
    `meta:${roomId}`
  );

  if (!meta) {
    return NextResponse.redirect(new URL("/?error=room-not-found", req.url));
  }

  const existingToken = req.cookies.get("auth-token")?.value;

  // if user joined room and refreshed the room browser he should join the room again
  if (existingToken && meta.connected.includes(existingToken)) {
    return NextResponse.next(); // allowes for request to join room
  }

  // if not in existing room or room is full user is not allowed
  if (meta.connected.length >= 5) {
    return NextResponse.redirect(new URL("/?error=room-full", req.url));
  }

  // authenticating user to join room using token
  const response = NextResponse.next();

  const token = nanoid();

  // token generation
  response.cookies.set("auth-token", token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  await redis.hset(`meta:${roomId}`, {
    // ... connected to check who was previously joined
    connected: [...meta.connected, token],
  });

  return response;
};

// this code should only service side when user goes to room path
export const config = {
  matcher: "/room/:path*",
};
