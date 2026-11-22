import type {ChatMessageEntry, P2PStatus, PeerInfo} from '../types';

export type P2PActionPayload =
  | {
      kind: 'tile_place';
      col: number;
      row: number;
      tool: string;
      rotation: number;
      freeMode: boolean;
    }
  | {
      kind: 'terrain_brush';
      col: number;
      row: number;
      tool: string;
      brushSize: 1 | 2;
    }
  | {
      kind: 'city_sync';
      encoded: string;
      author: string;
    }
  | {
      kind: 'chat_ping';
      text: string;
      author: string;
    };

export interface P2PRoomMeta {
  isPublic?: boolean;
  cityName?: string;
  regionName?: string;
  population?: number;
  tierName?: string;
}

export interface P2PCallbacks {
  onStatusChange: (status: P2PStatus) => void;
  onRemoteAction: (action: P2PActionPayload, fromName: string) => void;
  onInitialSnapshot: (encoded: string) => void;
  onChatMessage?: (msg: ChatMessageEntry) => void;
}

const ICE_SERVERS: RTCIceServer[] = [{urls: 'stun:stun.l.google.com:19302'}];

export class P2PSessionManager {
  private readonly callbacks: P2PCallbacks;
  private ws: WebSocket | null = null;
  private roomCode: string | null = null;
  private isPublic = true;
  private selfPeerId: string | null = null;
  private selfName = 'Burgemeester';
  private peers: PeerInfo[] = [];
  private peerConns = new Map<string, RTCPeerConnection>();
  private dataChannels = new Map<string, RTCDataChannel>();
  private lastEventText = 'Niet verbonden met een online kamer.';
  private latestEncodedProvider: (() => string) | null = null;

  constructor(callbacks: P2PCallbacks) {
    this.callbacks = callbacks;
  }

  setSnapshotProvider(provider: () => string): void {
    this.latestEncodedProvider = provider;
  }

  getStatus(): P2PStatus {
    const hasOpenRtc = Array.from(this.dataChannels.values()).some(
      (dc) => dc.readyState === 'open'
    );
    const transportMode = !this.ws || this.ws.readyState !== WebSocket.OPEN
      ? 'offline'
      : hasOpenRtc
        ? 'webrtc-p2p'
        : 'ws-relay';

    return {
      connected: Boolean(this.ws && this.ws.readyState === WebSocket.OPEN && this.roomCode),
      roomCode: this.roomCode,
      isPublic: this.isPublic,
      selfPeerId: this.selfPeerId,
      transportMode,
      peers: this.peers.map((p) => ({
        ...p,
        rtcConnected: this.dataChannels.get(p.id)?.readyState === 'open',
      })),
      lastEventText: this.lastEventText,
    };
  }

  private emitStatus(note?: string): void {
    if (note) this.lastEventText = note;
    this.callbacks.onStatusChange(this.getStatus());
  }

  connectRoom(
    roomCode: string,
    displayName: string,
    meta: P2PRoomMeta = {}
  ): void {
    this.disconnect();
    const cleanedCode =
      roomCode
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9-]/g, '') || `STAD-${Math.floor(1000 + Math.random() * 9000)}`;

    this.selfName = displayName.trim() || 'Burgemeester';
    this.selfPeerId = `p_${Math.random().toString(36).slice(2, 9)}`;
    this.isPublic = meta.isPublic !== false;

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws/signaling`;
    this.emitStatus(`Verbinden met kamer ${cleanedCode}...`);

    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    ws.addEventListener('open', () => {
      ws.send(
        JSON.stringify({
          type: 'join',
          roomCode: cleanedCode,
          peerId: this.selfPeerId,
          name: this.selfName,
          isPublic: this.isPublic,
          cityName: meta.cityName || 'Samenwerkstad',
          regionName: meta.regionName || 'Lage Landen Delta',
          population: meta.population || 0,
          tierName: meta.tierName || 'Dorp',
        })
      );
    });

    ws.addEventListener('message', (ev) => {
      this.handleSignalingMessage(String(ev.data));
    });

    ws.addEventListener('close', () => {
      if (this.ws === ws) {
        this.cleanupConnectionsOnly();
        this.ws = null;
        this.roomCode = null;
        this.peers = [];
        this.emitStatus('Verbinding met P2P-kamer verbroken.');
      }
    });

    ws.addEventListener('error', () => {
      this.emitStatus('Signaling-server tijdelijk onbereikbaar.');
    });
  }

  disconnect(): void {
    this.cleanupConnectionsOnly();
    if (this.ws) {
      const old = this.ws;
      this.ws = null;
      old.close();
    }
    this.roomCode = null;
    this.peers = [];
    this.emitStatus('Niet verbonden met een P2P-kamer.');
  }

  private cleanupConnectionsOnly(): void {
    for (const dc of this.dataChannels.values()) {
      try {
        dc.close();
      } catch {
        // ignore
      }
    }
    for (const pc of this.peerConns.values()) {
      try {
        pc.close();
      } catch {
        // ignore
      }
    }
    this.dataChannels.clear();
    this.peerConns.clear();
  }

  private handleSignalingMessage(raw: string): void {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }

    const type = String(msg.type || '');

    if (type === 'room:joined') {
      this.roomCode = String(msg.roomCode || '');
      this.isPublic = msg.isPublic !== false;
      this.peers = (msg.peers as PeerInfo[]) || [];
      const snap = msg.latestSnapshot as string | null;
      if (snap && typeof snap === 'string') {
        this.callbacks.onInitialSnapshot(snap);
      } else if (this.latestEncodedProvider && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: 'city:snapshot',
            snapshot: this.latestEncodedProvider(),
          })
        );
      }
      for (const peer of this.peers) {
        if (peer.id !== this.selfPeerId && this.selfPeerId! < peer.id) {
          void this.initiateRtcOffer(peer.id);
        }
      }
      this.emitStatus(
        `Verbonden in ${this.isPublic ? 'openbare' : 'privé'} kamer ${this.roomCode} (${this.peers.length} speler${this.peers.length === 1 ? '' : 's'}).`
      );
      return;
    }

    if (type === 'chat:message') {
      this.callbacks.onChatMessage?.({
        id: String(msg.id || ''),
        author: String(msg.author || 'Burgemeester'),
        color: String(msg.color || '#f5b942'),
        text: String(msg.text || ''),
        timestamp: Number(msg.timestamp || Date.now()),
      });
      return;
    }

    if (type === 'peer:joined') {
      const peer = msg.peer as PeerInfo;
      this.peers = (msg.peers as PeerInfo[]) || [];
      if (peer && peer.id !== this.selfPeerId && this.selfPeerId! < peer.id) {
        void this.initiateRtcOffer(peer.id);
      }
      this.emitStatus(`${peer?.name || 'Medespeler'} is de online stad binnengekomen.`);
      return;
    }

    if (type === 'peer:left') {
      const leftId = String(msg.peerId || '');
      this.peers = (msg.peers as PeerInfo[]) || [];
      this.dataChannels.get(leftId)?.close();
      this.peerConns.get(leftId)?.close();
      this.dataChannels.delete(leftId);
      this.peerConns.delete(leftId);
      this.emitStatus('Een medespeler heeft de kamer verlaten.');
      return;
    }

    if (type === 'rtc:offer') {
      const fromId = String(msg.fromPeerId || '');
      const offer = msg.payload as RTCSessionDescriptionInit;
      void this.handleRtcOffer(fromId, offer);
      return;
    }

    if (type === 'rtc:answer') {
      const fromId = String(msg.fromPeerId || '');
      const answer = msg.payload as RTCSessionDescriptionInit;
      const pc = this.peerConns.get(fromId);
      if (pc && answer) {
        void pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
      return;
    }

    if (type === 'rtc:ice') {
      const fromId = String(msg.fromPeerId || '');
      const candidate = msg.payload as RTCIceCandidateInit;
      const pc = this.peerConns.get(fromId);
      if (pc && candidate) {
        void pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      return;
    }

    if (type === 'city:snapshot') {
      const snap = msg.snapshot as string | null;
      if (snap && typeof snap === 'string') {
        this.callbacks.onInitialSnapshot(snap);
        this.emitStatus('Stadskaart gesynchroniseerd vanuit kamer.');
      }
      return;
    }

    if (type === 'relay:action') {
      const action = msg.action as P2PActionPayload;
      const fromName = String(msg.fromName || 'Medespeler');
      if (action) {
        this.callbacks.onRemoteAction(action, fromName);
      }
    }
  }

  sendChat(text: string): void {
    const clean = text.trim().slice(0, 220);
    if (!clean || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({type: 'chat:message', text: clean}));
  }

  updateRoomMeta(meta: {cityName: string; population: number; tierName: string}): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        type: 'room:meta',
        cityName: meta.cityName,
        population: meta.population,
        tierName: meta.tierName,
      })
    );
  }

  private getOrCreatePeerConn(remotePeerId: string): RTCPeerConnection {
    const existing = this.peerConns.get(remotePeerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection({iceServers: ICE_SERVERS});
    this.peerConns.set(remotePeerId, pc);

    pc.onicecandidate = (ev) => {
      if (ev.candidate && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: 'rtc:ice',
            targetPeerId: remotePeerId,
            payload: ev.candidate.toJSON(),
          })
        );
      }
    };

    pc.ondatachannel = (ev) => {
      this.wireDataChannel(remotePeerId, ev.channel);
    };

    return pc;
  }

  private wireDataChannel(remotePeerId: string, dc: RTCDataChannel): void {
    this.dataChannels.set(remotePeerId, dc);
    dc.onopen = () => {
      this.emitStatus(`Directe WebRTC P2P-verbinding actief in ${this.roomCode}!`);
    };
    dc.onclose = () => {
      this.emitStatus('WebRTC datakanaal gesloten (relay actief).');
    };
    dc.onmessage = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.data)) as {
          action: P2PActionPayload;
          author: string;
        };
        if (parsed?.action) {
          this.callbacks.onRemoteAction(parsed.action, parsed.author || 'Peer');
        }
      } catch {
        // ignore
      }
    };
  }

  private async initiateRtcOffer(remotePeerId: string): Promise<void> {
    if (typeof RTCPeerConnection === 'undefined') return;
    try {
      const pc = this.getOrCreatePeerConn(remotePeerId);
      const dc = pc.createDataChannel('stad-sync');
      this.wireDataChannel(remotePeerId, dc);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: 'rtc:offer',
            targetPeerId: remotePeerId,
            payload: offer,
          })
        );
      }
    } catch {
      // fallback remains active over WebSocket
    }
  }

  private async handleRtcOffer(
    remotePeerId: string,
    offer: RTCSessionDescriptionInit
  ): Promise<void> {
    if (typeof RTCPeerConnection === 'undefined') return;
    try {
      const pc = this.getOrCreatePeerConn(remotePeerId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: 'rtc:answer',
            targetPeerId: remotePeerId,
            payload: answer,
          })
        );
      }
    } catch {
      // fallback remains active
    }
  }

  broadcastAction(action: P2PActionPayload, updatedEncoded?: string): void {
    if (!this.roomCode) return;

    const payloadStr = JSON.stringify({action, author: this.selfName});
    let sentViaRtcAll = this.peers.length > 1;
    for (const peer of this.peers) {
      if (peer.id === this.selfPeerId) continue;
      const dc = this.dataChannels.get(peer.id);
      if (dc && dc.readyState === 'open') {
        dc.send(payloadStr);
      } else {
        sentViaRtcAll = false;
      }
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      if (!sentViaRtcAll) {
        this.ws.send(
          JSON.stringify({
            type: 'relay:action',
            action,
            snapshot: updatedEncoded,
          })
        );
      } else if (updatedEncoded) {
        this.ws.send(
          JSON.stringify({
            type: 'city:snapshot',
            snapshot: updatedEncoded,
          })
        );
      }
    }
  }
}
