import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

import { Server, matchMaker } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import express, { type Request, type Response } from "express";

import {
  DEFAULT_BOTS_PER_TEAM,
  PRIVATE_ROOM_NAME,
  PUBLIC_ROOM_NAME,
  TEAM_CONFIG,
  type JoinPayload
} from "../../shared/src";
import { WarRoom } from "./rooms/WarRoom";

const port = Number(process.env.PORT ?? 2567);
const app = express();
const server = http.createServer(app);
const clientDistPath = resolveClientDistPath();

let publicRoomId = "";

app.get("/health", (_request: Request, response: Response) => {
  response.json({
    status: "ok",
    publicRoomId,
    rooms: [PUBLIC_ROOM_NAME, PRIVATE_ROOM_NAME],
    factions: Object.values(TEAM_CONFIG).map((team) => team.name),
    clientServedFrom: clientDistPath ?? null,
    accessUrls: getAccessUrls(port)
  });
});

app.get("/matchmaking/public-room", async (_request: Request, response: Response) => {
  try {
    const room = await ensurePublicRoom();
    response.json({
      roomId: room.roomId,
      roomName: PUBLIC_ROOM_NAME
    });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : "Public room unavailable"
    });
  }
});

if (clientDistPath) {
  app.use(express.static(clientDistPath));
  app.use((request, response, next) => {
    if (request.method !== "GET" || request.path.startsWith("/health") || request.path.startsWith("/matchmaking")) {
      next();
      return;
    }

    response.sendFile(path.join(clientDistPath, "index.html"));
  });
}

const gameServer = new Server({
  server,
  transport: new WebSocketTransport({
    server
  })
});

gameServer.define(PUBLIC_ROOM_NAME, WarRoom);
gameServer.define(PRIVATE_ROOM_NAME, WarRoom);

void gameServer.listen(port).then(async () => {
  const accessUrls = getAccessUrls(port);
  try {
    const publicRoom = await ensurePublicRoom();
    console.log(`War Swarm public room ready: ${publicRoom.roomId}`);
  } catch (error) {
    console.error("Failed to create public room", error);
  }

  console.log(`War Swarm server listening on ${accessUrls[0]}`);
  for (const accessUrl of accessUrls.slice(1)) {
    console.log(`Additional access URL: ${accessUrl}`);
  }
  if (clientDistPath) {
    console.log(`Serving client build from ${clientDistPath}`);
  } else {
    console.log("Client build not found. Run `npm run build -w @warswarm/client` or `npm run host` for same-origin hosting.");
  }
});

async function ensurePublicRoom() {
  if (publicRoomId) {
    try {
      return await matchMaker.getRoomById(publicRoomId);
    } catch {
      publicRoomId = "";
    }
  }

  const room = await matchMaker.createRoom(PUBLIC_ROOM_NAME, {
    visibility: "public",
    preferredTeam: "auto",
    botCountPerTeam: DEFAULT_BOTS_PER_TEAM
  } satisfies JoinPayload);
  publicRoomId = room.roomId;
  return room;
}

function resolveClientDistPath(): string | undefined {
  const candidates = [
    path.resolve(__dirname, "../../client/dist"),
    path.resolve(__dirname, "../../../../client/dist")
  ];

  return candidates.find((candidate) => fs.existsSync(path.join(candidate, "index.html")));
}

function getAccessUrls(activePort: number): string[] {
  const urls = [`http://localhost:${activePort}`];
  const seen = new Set<string>();

  for (const details of Object.values(os.networkInterfaces()).flat()) {
    if (!details || details.internal || details.family !== "IPv4") {
      continue;
    }

    if (seen.has(details.address)) {
      continue;
    }

    seen.add(details.address);
    urls.push(`http://${details.address}:${activePort}`);
  }

  return urls;
}
