import type { NextApiRequest } from "next";
import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import { Server as IOServer } from "socket.io";
import { setIO, getIO } from "@/lib/realtime/server";

interface SocketWithIO extends NetSocket {
  server: HTTPServer & { io?: IOServer };
}

interface NextApiResponseWithSocket {
  socket: SocketWithIO;
  status: (code: number) => NextApiResponseWithSocket;
  end: (body?: string) => void;
}

/**
 * Realtime transport lives on the Pages Router because it needs the raw
 * Node HTTP server (`res.socket.server`) to attach Socket.IO to — the App
 * Router's Response-based route handlers don't expose that. The io
 * instance is cached on the server object (survives hot reload/dev) and
 * mirrored into a global (src/lib/realtime/server.ts) so App Router API
 * routes in the same process can emit through it after DB writes.
 */
export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (!res.socket.server.io) {
    const io = new IOServer(res.socket.server, {
      path: "/api/socket",
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
