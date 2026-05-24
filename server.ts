import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

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

  // Expose io to API routes via global
  globalThis.io = io;

  io.on("connection", (socket) => {
    socket.on("join-room", ({ eventId }: { eventId: string }) => {
      socket.join(`event:${eventId}`);
    });

    socket.on("leave-room", ({ eventId }: { eventId: string }) => {
      socket.leave(`event:${eventId}`);
    });

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
