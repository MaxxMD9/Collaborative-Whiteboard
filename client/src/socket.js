import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

let socket = null;

export function connectSocket(token) {
  // If already connected with same token, reuse existing socket
  if (socket?.connected) return socket;

  // Only create a new socket if one doesn't exist
  if (!socket) {
    socket = io(SERVER_URL, {
      auth: { token }
    });

    socket.on("connect", () => {
      console.log("[Socket] Connected:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket] Connection error:", err.message);
    });

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected");
    });
  }

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}