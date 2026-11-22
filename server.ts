import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import {WebSocketServer, WebSocket} from 'ws';
import {GoogleGenAI, ThinkingLevel, Type} from '@google/genai';

const PORT = Number(process.env.PORT || 3000);
const IS_PROD =
  process.env.NODE_ENV === 'production' &&
  fs.existsSync(path.resolve(process.cwd(), 'dist', 'index.html'));

const DATA_DIR = path.resolve(process.cwd(), 'data');
const CITIES_FILE = path.join(DATA_DIR, 'online-cities.json');

interface PublishedCityRecord {
  id: string;
  cityName: string;
  authorName: string;
  regionName: string;
  tierName: string;
  population: number;
  happiness: number;
  likes: number;
  createdAt: number;
  encoded: string;
}

function makeSeedCityEncoded(
  cityName: string,
  preset: string,
  seed: number,
  regionId: string,
  plotId: string,
  extraBuildings: Array<[number, number, string, number, number]>
): string {
  const N = 16;
  const tiles: Array<[string, string, number, number, number]> = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const isRiver =
        preset === 'islands'
          ? c === 0 || c === 15 || r === 0 || r === 15
          : Math.abs(c - 11.5) < 1.1;
      tiles.push([isRiver ? 'water' : 'grass', '', 0, 0, 1]);
    }
  }
  const setTile = (
    c: number,
    r: number,
    terr: string,
    bld: string,
    rot = 0,
    locked = 0,
    density = 1
  ) => {
    const idx = r * N + c;
    if (tiles[idx]) {
      tiles[idx] = [terr, bld, rot, locked, density];
    }
  };
  setTile(7, 7, 'grass', 'townhall', 0, 1, 1);
  for (let c = 5; c <= 10; c++) {
    setTile(c, 6, tiles[6 * N + c][0], 'road');
    setTile(c, 8, tiles[8 * N + c][0], 'road');
  }
  for (let r = 6; r <= 9; r++) {
    setTile(6, r, tiles[r * N + 6][0], 'road');
    setTile(9, r, tiles[r * N + 9][0], 'road');
  }
  for (const [c, r, b, rot, d] of extraBuildings) {
    setTile(c, r, 'grass', b, rot, 0, d);
  }
  const payload = {
    v: 4,
    gridSize: N,
    settings: {
      cityName,
      regionId,
      plotId,
      difficulty: 'normal',
      mapPreset: preset,
      mapSeed: seed,
      timeOfDay: 'day',
      trafficDensity: 'normal',
      disastersEnabled: true,
      autoBuildEnabled: false,
      autoBuildIntervalSec: 2.2,
    },
    budget: 2650,
    taxes: {residential: 7, commercial: 7, industrial: 7},
    ordinances: ['solar_subsidy'],
    neighborTradeMw: 0,
    tiles,
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}

function loadPublishedCities(): PublishedCityRecord[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, {recursive: true});
    }
    if (fs.existsSync(CITIES_FILE)) {
      const raw = fs.readFileSync(CITIES_FILE, 'utf8');
      const parsed = JSON.parse(raw) as PublishedCityRecord[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // seed fresh
  }

  const seeded: PublishedCityRecord[] = [
    {
      id: 'seed-delta-stad',
      cityName: 'Oranjestad Delta',
      authorName: 'Arch. Lotte',
      regionName: 'Lage Landen Delta (12 Kavels)',
      tierName: 'Bloeiende Stad',
      population: 196,
      happiness: 91,
      likes: 14,
      createdAt: Date.now() - 1000 * 60 * 120,
      encoded: makeSeedCityEncoded(
        'Oranjestad Delta',
        'polder',
        3100,
        'delta',
        'delta-nieuw-amsterdam',
        [
          [7, 5, 'house', 2, 2],
          [8, 5, 'house', 2, 2],
          [5, 7, 'shop', 1, 2],
          [8, 7, 'park', 0, 1],
          [7, 9, 'university', 0, 1],
          [8, 9, 'stadium', 0, 1],
          [5, 5, 'trainstation', 0, 1],
          [4, 8, 'watertower', 0, 1],
          [10, 5, 'solarplant', 0, 1],
          [10, 7, 'windmill', 0, 1],
          [6, 5, 'house', 2, 3],
          [9, 5, 'shop', 2, 2],
        ]
      ),
    },
    {
      id: 'seed-zonnebaai-kroon',
      cityName: 'Zonnebaai Paradijs',
      authorName: 'Burgemeester Bram',
      regionName: 'Zonnebaai Archipel (12 Kavels)',
      tierName: 'Metropool',
      population: 312,
      happiness: 94,
      likes: 22,
      createdAt: Date.now() - 1000 * 60 * 45,
      encoded: makeSeedCityEncoded(
        'Zonnebaai Paradijs',
        'islands',
        1290,
        'archipelago',
        'arch-maxima',
        [
          [7, 5, 'house', 2, 3],
          [8, 5, 'house', 2, 3],
          [6, 5, 'shop', 2, 3],
          [9, 5, 'shop', 2, 2],
          [5, 7, 'trainstation', 1, 1],
          [8, 7, 'park', 0, 1],
          [7, 9, 'landmark', 0, 1],
          [8, 9, 'stadium', 0, 1],
          [10, 9, 'seaport', 0, 1],
          [4, 5, 'airport', 0, 1],
          [4, 9, 'university', 0, 1],
          [10, 5, 'solarplant', 0, 1],
          [10, 7, 'windmill', 0, 1],
          [5, 9, 'watertower', 0, 1],
        ]
      ),
    },
  ];
  savePublishedCities(seeded);
  return seeded;
}

function savePublishedCities(list: PublishedCityRecord[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, {recursive: true});
    }
    fs.writeFileSync(CITIES_FILE, JSON.stringify(list.slice(0, 40), null, 2), 'utf8');
  } catch {
    // ignore fs errors in read-only edge envs
  }
}

function createGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface RoomPeer {
  id: string;
  name: string;
  color: string;
  ws: WebSocket;
}

interface RoomState {
  code: string;
  isPublic: boolean;
  cityName: string;
  regionName: string;
  hostName: string;
  population: number;
  tierName: string;
  peers: Map<string, RoomPeer>;
  latestSnapshot: unknown | null;
  updatedAt: number;
}

const PEER_COLORS = ['#f5b942', '#34d399', '#60a5fa', '#fb7185', '#a78bfa'];
const rooms = new Map<string, RoomState>();
let publishedCities = loadPublishedCities();

function sanitizeRoomCode(raw: unknown): string {
  const cleaned = String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 14);
  return cleaned || `STAD-${Math.floor(1000 + Math.random() * 9000)}`;
}

function sendWs(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastRoom(
  room: RoomState,
  payload: unknown,
  excludePeerId?: string
): void {
  for (const [peerId, peer] of room.peers.entries()) {
    if (peerId === excludePeerId) continue;
    sendWs(peer.ws, payload);
  }
}

function serializePeerList(room: RoomState): Array<{
  id: string;
  name: string;
  color: string;
}> {
  return Array.from(room.peers.values()).map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
  }));
}

function cleanupRooms(): void {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (room.peers.size === 0 && now - room.updatedAt > 1000 * 60 * 15) {
      rooms.delete(code);
    }
  }
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({limit: '2mb'}));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      aiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      activeRooms: rooms.size,
      publishedCount: publishedCities.length,
    });
  });

  app.get('/api/online/rooms', (_req, res) => {
    cleanupRooms();
    const list = Array.from(rooms.values())
      .filter((r) => r.isPublic && r.peers.size > 0)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((r) => ({
        roomCode: r.code,
        cityName: r.cityName,
        regionName: r.regionName,
        hostName: r.hostName,
        peerCount: r.peers.size,
        maxPeers: 8,
        population: r.population,
        tierName: r.tierName,
        updatedAt: r.updatedAt,
      }));
    res.json({rooms: list});
  });

  app.get('/api/online/cities', (_req, res) => {
    res.json({cities: publishedCities});
  });

  app.post('/api/online/publish', (req, res) => {
    const body = (req.body || {}) as Partial<PublishedCityRecord>;
    const cityName = String(body.cityName || '').trim().slice(0, 32);
    const authorName = String(body.authorName || 'Burgemeester').trim().slice(0, 24);
    const regionName = String(body.regionName || 'Lage Landen Delta').trim().slice(0, 48);
    const tierName = String(body.tierName || 'Stad').trim().slice(0, 28);
    const population = Math.max(0, Math.round(Number(body.population) || 0));
    const happiness = Math.max(0, Math.min(100, Math.round(Number(body.happiness) || 80)));
    const encoded = String(body.encoded || '').trim();

    if (!cityName || !encoded || encoded.length < 30 || encoded.length > 80000) {
      res.status(400).json({error: 'Ongeldige stadsgegevens voor publicatie.'});
      return;
    }

    const entry: PublishedCityRecord = {
      id: `city-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      cityName,
      authorName: authorName || 'Burgemeester',
      regionName,
      tierName,
      population,
      happiness,
      likes: 1,
      createdAt: Date.now(),
      encoded,
    };

    publishedCities = [entry, ...publishedCities].slice(0, 40);
    savePublishedCities(publishedCities);
    res.json({ok: true, city: entry});
  });

  app.post('/api/online/cities/:id/like', (req, res) => {
    const id = String(req.params.id || '');
    const found = publishedCities.find((c) => c.id === id);
    if (!found) {
      res.status(404).json({error: 'Stad niet gevonden.'});
      return;
    }
    found.likes += 1;
    savePublishedCities(publishedCities);
    res.json({ok: true, likes: found.likes});
  });

  app.post('/api/ai/plan-city', async (req, res) => {
    const ai = createGenAIClient();
    if (!ai) {
      res.status(503).json({
        error:
          'Geen Gemini API-sleutel geconfigureerd. Voeg GEMINI_API_KEY toe bij Instellingen > Secrets om AI Stadsarchitect te gebruiken.',
      });
      return;
    }

    const body = (req.body || {}) as {
      prompt?: unknown;
      gridSize?: unknown;
      budget?: unknown;
      terrainRows?: unknown;
    };

    const userPrompt = String(body.prompt || '').trim();
    if (!userPrompt) {
      res.status(400).json({error: 'Geef een duidelijke stadsomschrijving mee.'});
      return;
    }

    const gridSize = Math.max(8, Math.min(20, Number(body.gridSize) || 16));
    const budget = Math.max(0, Number(body.budget) || 1650);
    const terrainRows = Array.isArray(body.terrainRows) ? body.terrainRows : [];

    try {
      const systemInstruction =
        'Je bent een meester-stedenbouwkundige voor StadBouwer 3000 (SimCity 3000 + SimCity 4 stijl). ' +
        'Ontwerp een functionele, mooie stadsindeling op het gegeven raster. ' +
        'Regels: ' +
        '1) Geldige gebouwen: road, trainstation, house, shop, park, factory, seaport, airport, windmill, solarplant, powerplant, nuclear, watertower, police, firestation, school, university, hospital, stadium, landmark. ' +
        '2) Plaats geen gebouwen op water (W) of berg (M); alleen road mag als brug over water (W). Zeehavens (seaport) horen het liefst naast water (W) of op zand (S). ' +
        '3) Woningen (house) en winkels (shop) moeten zoveel mogelijk naast wegen (road) staan. ' +
        '4) Houd fabrieken (factory) en centrales (powerplant) op afstand van woningen of scherm af met parken (park). ' +
        '5) Voeg waar gepast openbaar vervoer (trainstation), onderwijs (school, university), sport (stadium), zorg (hospital), politie/brandweer en schone stroom (windmill, solarplant, nuclear) toe. ' +
        '6) Houd rekening met het beschikbare budget en lever 16 tot 42 doordachte plaatsingen. ' +
        'Antwoord strikt in JSON en schrijf naam/concept in natuurlijk Nederlands.';

      const contents =
        `Stadsopdracht van de burgemeester: "${userPrompt}"\n` +
        `Rastergrootte: ${gridSize}x${gridSize} (col 0..${gridSize - 1}, row 0..${gridSize - 1})\n` +
        `Beschikbaar budget: €${budget}\n` +
        `Terreinkaart (G=gras, W=water, S=zand, F=bos, H=heuvel, M=berg, T=stadhuis/bezet):\n` +
        `${terrainRows.join('\n')}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction,
          thinkingConfig: {thinkingLevel: ThinkingLevel.LOW},
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            required: ['cityName', 'concept', 'placements'],
            properties: {
              cityName: {type: Type.STRING},
              concept: {type: Type.STRING},
              placements: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: ['col', 'row', 'building', 'rotation'],
                  properties: {
                    col: {type: Type.INTEGER},
                    row: {type: Type.INTEGER},
                    building: {type: Type.STRING},
                    rotation: {type: Type.INTEGER},
                  },
                },
              },
            },
          },
        },
      });

      const raw = (response.text || '{}').trim();
      const parsed = JSON.parse(raw);
      res.json(parsed);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'AI Stadsarchitect kon geen plan genereren.';
      res.status(500).json({error: msg});
    }
  });

  app.post('/api/ai/advisor', async (req, res) => {
    const ai = createGenAIClient();
    if (!ai) {
      res.status(503).json({
        error:
          'Geen Gemini API-sleutel geconfigureerd. Voeg GEMINI_API_KEY toe bij Instellingen > Secrets voor live AI-stadsadvies.',
      });
      return;
    }

    const body = (req.body || {}) as {
      metrics?: unknown;
      counts?: unknown;
      budget?: unknown;
      question?: unknown;
    };

    try {
      const systemInstruction =
        'Je bent de hoofd-stadsadviseur (geïnspireerd door klassieke SimCity-adviseurs) in StadBouwer 3000. ' +
        'Geef scherp, concreet, humorvol en direct uitvoerbaar Nederlands advies op basis van de echte stadscijfers. ' +
        'recommendedTool moet een van deze zijn: road, trainstation, house, shop, park, factory, seaport, airport, windmill, solarplant, powerplant, nuclear, watertower, police, firestation, school, university, hospital, stadium, landmark.';

      const contents =
        `Stadscijfers: ${JSON.stringify({
          budget: body.budget,
          metrics: body.metrics,
          counts: body.counts,
        })}\n` +
        `Vraag van de burgemeester: "${String(body.question || 'Wat heeft mijn stad nu het hardst nodig?')}"`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction,
          thinkingConfig: {thinkingLevel: ThinkingLevel.LOW},
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            required: [
              'advisorName',
              'role',
              'mood',
              'headline',
              'summary',
              'tips',
              'recommendedTool',
            ],
            properties: {
              advisorName: {type: Type.STRING},
              role: {type: Type.STRING},
              mood: {type: Type.STRING},
              headline: {type: Type.STRING},
              summary: {type: Type.STRING},
              tips: {
                type: Type.ARRAY,
                items: {type: Type.STRING},
              },
              recommendedTool: {type: Type.STRING},
            },
          },
        },
      });

      const raw = (response.text || '{}').trim();
      res.json(JSON.parse(raw));
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'AI Adviseur niet bereikbaar.';
      res.status(500).json({error: msg});
    }
  });

  const server = http.createServer(app);

  const wss = new WebSocketServer({server, path: '/ws/signaling'});

  wss.on('connection', (ws) => {
    let currentRoom: RoomState | null = null;
    let currentPeer: RoomPeer | null = null;

    ws.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(raw)) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = String(msg.type || '');

      if (type === 'join') {
        const code = sanitizeRoomCode(msg.roomCode);
        const peerId =
          String(msg.peerId || '').slice(0, 32) ||
          `p_${Math.random().toString(36).slice(2, 9)}`;
        const name =
          String(msg.name || 'Burgemeester').trim().slice(0, 24) ||
          'Burgemeester';
        const isPublic = msg.isPublic !== false;
        const cityName = String(msg.cityName || 'Samenwerkstad').trim().slice(0, 32);
        const regionName = String(msg.regionName || 'Lage Landen Delta').trim().slice(0, 48);
        const population = Math.max(0, Math.round(Number(msg.population) || 0));
        const tierName = String(msg.tierName || 'Dorp').trim().slice(0, 28);

        let room = rooms.get(code);
        if (!room) {
          room = {
            code,
            isPublic,
            cityName,
            regionName,
            hostName: name,
            population,
            tierName,
            peers: new Map(),
            latestSnapshot: null,
            updatedAt: Date.now(),
          };
          rooms.set(code, room);
        }

        const color = PEER_COLORS[room.peers.size % PEER_COLORS.length];
        const peer: RoomPeer = {id: peerId, name, color, ws};
        room.peers.set(peerId, peer);
        room.updatedAt = Date.now();
        currentRoom = room;
        currentPeer = peer;

        sendWs(ws, {
          type: 'room:joined',
          roomCode: room.code,
          isPublic: room.isPublic,
          peerId,
          color,
          peers: serializePeerList(room),
          latestSnapshot: room.latestSnapshot,
        });

        broadcastRoom(
          room,
          {
            type: 'peer:joined',
            peer: {id: peer.id, name: peer.name, color: peer.color},
            peers: serializePeerList(room),
          },
          peerId
        );
        return;
      }

      if (!currentRoom || !currentPeer) return;
      currentRoom.updatedAt = Date.now();

      if (type === 'room:meta') {
        if (typeof msg.cityName === 'string' && msg.cityName.trim()) {
          currentRoom.cityName = msg.cityName.trim().slice(0, 32);
        }
        if (typeof msg.tierName === 'string' && msg.tierName.trim()) {
          currentRoom.tierName = msg.tierName.trim().slice(0, 28);
        }
        if (typeof msg.population === 'number' && Number.isFinite(msg.population)) {
          currentRoom.population = Math.max(0, Math.round(msg.population));
        }
        return;
      }

      if (type === 'chat:message') {
        const text = String(msg.text || '').trim().slice(0, 220);
        if (!text) return;
        const chatEvent = {
          type: 'chat:message',
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          author: currentPeer.name,
          color: currentPeer.color,
          text,
          timestamp: Date.now(),
        };
        broadcastRoom(currentRoom, chatEvent);
        return;
      }

      if (
        type === 'rtc:offer' ||
        type === 'rtc:answer' ||
        type === 'rtc:ice'
      ) {
        const targetId = String(msg.targetPeerId || '');
        const target = currentRoom.peers.get(targetId);
        if (target) {
          sendWs(target.ws, {
            type,
            fromPeerId: currentPeer.id,
            payload: msg.payload,
          });
        }
        return;
      }

      if (type === 'city:snapshot') {
        currentRoom.latestSnapshot = msg.snapshot ?? null;
        broadcastRoom(
          currentRoom,
          {
            type: 'city:snapshot',
            fromPeerId: currentPeer.id,
            snapshot: currentRoom.latestSnapshot,
          },
          currentPeer.id
        );
        return;
      }

      if (type === 'relay:action') {
        if (msg.snapshot) {
          currentRoom.latestSnapshot = msg.snapshot;
        }
        broadcastRoom(
          currentRoom,
          {
            type: 'relay:action',
            fromPeerId: currentPeer.id,
            fromName: currentPeer.name,
            action: msg.action,
          },
          currentPeer.id
        );
      }
    });

    ws.on('close', () => {
      if (currentRoom && currentPeer) {
        currentRoom.peers.delete(currentPeer.id);
        currentRoom.updatedAt = Date.now();
        broadcastRoom(currentRoom, {
          type: 'peer:left',
          peerId: currentPeer.id,
          peers: serializePeerList(currentRoom),
        });
        cleanupRooms();
      }
    });
  });

  if (IS_PROD) {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true, hmr: false},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`StadBouwer 3000 server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
