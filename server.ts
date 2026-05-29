import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function main() {
  await app.prepare();

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || `http://${hostname}:${port}`,
      credentials: true,
    },
    path: "/api/socket",
    addTrailingSlash: false,
  });

  // Redis adapter — lets multiple server instances share socket rooms via Upstash pub/sub
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const pubClient = new Redis(redisUrl);
    const subClient = new Redis(redisUrl);

    pubClient.on("error", (err) =>
      console.error("Redis pub client error:", err),
    );
    subClient.on("error", (err) =>
      console.error("Redis sub client error:", err),
    );

    io.adapter(createAdapter(pubClient, subClient));
    console.log("> Socket.IO connected to Redis adapter (Upstash)");
  } else {
    console.warn("> REDIS_URL not set — running without Redis adapter (single instance only)");
  }

  // Expose io to REST API route handlers
  globalThis.io = io;

  io.on("connection", (socket) => {
    socket.on("join-room", ({ eventId }: { eventId: string }) => {
      socket.join(`event:${eventId}`);
    });

    socket.on("leave-room", ({ eventId }: { eventId: string }) => {
      socket.leave(`event:${eventId}`);
    });

    // Typing indicator — relay to everyone else in the room
    socket.on(
      "user-typing",
      ({ eventId, user }: { eventId: string; user: string }) => {
        socket.to(`event:${eventId}`).emit("user-typing", { eventId, user });
      },
    );
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}

main().catch(console.error);
