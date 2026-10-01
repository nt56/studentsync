import assert from "node:assert/strict";
import { io } from "socket.io-client";

// No credentials or database fixtures: a guest must be rejected at the handshake.
const socket = io(process.env.SMOKE_URL || "http://127.0.0.1:3100", {
  path: "/api/socket", addTrailingSlash: false, reconnection: false, timeout: 10000,
});
try {
  const message = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Socket authentication check timed out")), 15000);
    socket.on("connect", () => { clearTimeout(timeout); reject(new Error("Guest socket was accepted")); });
    socket.on("connect_error", (error) => { clearTimeout(timeout); resolve(error.message); });
  });
  assert.equal(message, "Sign in to join event chat");
  console.log("PASS guest Socket.IO handshake rejected by session authentication");
} finally {
  socket.disconnect();
}
