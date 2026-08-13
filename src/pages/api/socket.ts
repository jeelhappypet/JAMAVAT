import type { NextApiRequest } from "next";
import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import { Server as IOServer } from "socket.io";
import { setIO, getIO } from "@/lib/realtime/server";

/** Engine.IO path — must NOT be `/api/socket`, or warm-up GETs become "Transport unknown". */
export const SOCKET_IO_PATH = "/socket.io";

interface SocketWithIO extends NetSocket {
  server: HTTPServer & { io?: IOServer };
}

interface NextApiResponseWithSocket {
  socket: SocketWithIO;
  status: (code: number) => NextApiResponseWithSocket;
  setHeader: (name: string, value: string) => void;
  end: (body?: string) => void;
}

/**
 * Warm-up / init only. Attaches Socket.IO to the Node HTTP server on
 * SOCKET_IO_PATH. Clients must connect to that path — not this route —
 * so plain GET /api/socket never hits Engine.IO (which would 400 with
 * "Transport unknown" after the server is already attached).
 */
export default function handler(_req: NextApiRequest, res: NextApiResponseWithSocket) {
  // Vercel serverless has no persistent process to hold sockets.
  if (process.env.VERCEL || !res.socket?.server) {
    res.setHeader("X-Jamavat-Realtime", "unavailable");
    res.status(200).end("ok");
    return;
  }

  if (!res.socket.server.io) {
    const io = new IOServer(res.socket.server, {
      path: SOCKET_IO_PATH,
      addTrailingSlash: false,
    });
    res.socket.server.io = io;
    setIO(io);
  } else if (!getIO()) {
    setIO(res.socket.server.io);
  }

  res.status(200).end("ok");
}

export const config = {
  api: { bodyParser: false },
};
