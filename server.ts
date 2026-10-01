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

  // Next has now loaded .env; importing auth before prepare would miss its config.
  const { auth } = await import("./lib/auth");
  const { connectDB } = await import("./lib/db");
  const { default: User } = await import("./models/User");
  const { canAccessEventChat } = await import("./lib/chat-access");

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

  // Durable jobs are stored before the API returns. A lease prevents two server
  // instances from claiming the same job; interrupted jobs become available again.
  if (process.env.OUTBOX_WORKER_ENABLED !== "false") {
    const { processOutbox } = await import("./lib/outbox");
    const { materializeReminders } = await import("./lib/reminders");
    let workerBusy = false;
    const timer = setInterval(async () => {
      if (workerBusy) return;
      workerBusy = true;
      try { await materializeReminders(); }
      catch (error) { console.error("Reminder worker failed", error); }
      try { await processOutbox(); }
      catch (error) { console.error("Email worker failed", error); }
      finally { workerBusy = false; }
    }, 15_000);
    timer.unref();
  }

  io.use(async (socket, next) => {
    try {
      const session = await auth.api.getSession({
        headers: new Headers({ cookie: socket.request.headers.cookie || "" }),
        query: { disableCookieCache: true },
      });
      if (!session) return next(new Error("Sign in to join event chat"));
      await connectDB();
      const user = await User.findOne({ email: session.user.email }).select("role firstName lastName").lean();
      if (!user) return next(new Error("User profile not found"));
      socket.data.userId = user._id.toString();
      socket.data.role = user.role;
      socket.data.name = `${user.firstName} ${user.lastName}`.trim();
      socket.data.expiresAt = new Date(session.session.expiresAt).getTime();
      socket.data.sessionId = session.session.id;
      next();
    } catch {
      next(new Error("Unable to authenticate chat connection"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.data.userId}`);
    socket.join(`session:${socket.data.sessionId}`);
    const expiryTimer = setTimeout(() => socket.disconnect(true), Math.min(Math.max(0, socket.data.expiresAt - Date.now()), 2_147_483_647));
    socket.on("disconnect", () => clearTimeout(expiryTimer));
    socket.on("join-room", async (payload: unknown, acknowledge?: (result: { ok: boolean }) => void) => {
      const reply = (ok: boolean) => { if (typeof acknowledge === "function") acknowledge({ ok }); };
      const eventId = payload && typeof payload === "object" && "eventId" in payload ? payload.eventId : null;
      if (typeof eventId !== "string" || Date.now() >= socket.data.expiresAt) return reply(false);
      try {
        const user = await User.findById(socket.data.userId).select("role").lean();
        if (!user || !await canAccessEventChat(eventId, socket.data.userId, user.role)) return reply(false);
        await socket.join(`event:${eventId}`);
        reply(true);
      } catch {
        reply(false);
      }
    });

    socket.on("leave-room", (payload?: { eventId?: unknown }) => {
      if (typeof payload?.eventId === "string") socket.leave(`event:${payload.eventId}`);
    });

    // Typing indicator — relay to everyone else in the room
    socket.on(
      "user-typing",
      (payload?: { eventId?: unknown }) => {
        const eventId = payload?.eventId;
        if (typeof eventId !== "string" || !socket.rooms.has(`event:${eventId}`) || Date.now() >= socket.data.expiresAt) return;
        if (Date.now() - (socket.data.lastTypingAt || 0) < 1000) return;
        socket.data.lastTypingAt = Date.now();
        socket.to(`event:${eventId}`).emit("user-typing", { eventId, user: socket.data.name });
      },
    );
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}

main().catch(console.error);
