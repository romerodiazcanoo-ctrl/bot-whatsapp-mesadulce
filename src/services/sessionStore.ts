import { ChatSession, ChatMessage } from "../types/index.js";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

// ─── Interfaz común ───────────────────────────────────────────────────────────

interface ISessionStore {
  get(waId: string): Promise<ChatSession | null>;
  set(session: ChatSession): Promise<void>;
  delete(waId: string): Promise<void>;
}

// ─── Implementación en memoria ────────────────────────────────────────────────

class MemorySessionStore implements ISessionStore {
  private readonly store = new Map<string, ChatSession>();

  async get(waId: string): Promise<ChatSession | null> {
    const session = this.store.get(waId) ?? null;
    if (session && this.isExpired(session)) {
      this.store.delete(waId);
      return null;
    }
    return session;
  }

  async set(session: ChatSession): Promise<void> {
    this.store.set(session.waId, session);
  }

  async delete(waId: string): Promise<void> {
    this.store.delete(waId);
  }

  private isExpired(session: ChatSession): boolean {
    const ageSeconds = (Date.now() - session.updatedAt) / 1000;
    return ageSeconds > config.session.ttlSeconds;
  }
}

// ─── Implementación en Redis ──────────────────────────────────────────────────

class RedisSessionStore implements ISessionStore {
  private client: import("ioredis").Redis | null = null;

  private async getClient(): Promise<import("ioredis").Redis> {
    if (!this.client) {
      const { default: Redis } = await import("ioredis");
      this.client = new Redis(config.session.redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
      });
      await this.client.connect();
      logger.info("Redis session store connected");
    }
    return this.client;
  }

  async get(waId: string): Promise<ChatSession | null> {
    const redis = await this.getClient();
    const raw = await redis.get(`session:${waId}`);
    if (!raw) return null;
    return JSON.parse(raw) as ChatSession;
  }

  async set(session: ChatSession): Promise<void> {
    const redis = await this.getClient();
    await redis.setex(
      `session:${session.waId}`,
      config.session.ttlSeconds,
      JSON.stringify(session),
    );
  }

  async delete(waId: string): Promise<void> {
    const redis = await this.getClient();
    await redis.del(`session:${waId}`);
  }
}

// ─── Factory & export ─────────────────────────────────────────────────────────

const store: ISessionStore =
  config.session.store === "redis"
    ? new RedisSessionStore()
    : new MemorySessionStore();

export const sessionStore = {
  async getOrCreate(waId: string, displayName: string): Promise<ChatSession> {
    const existing = await store.get(waId);
    if (existing) return existing;

    const session: ChatSession = {
      waId,
      displayName,
      history: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await store.set(session);
    return session;
  },

  async addMessage(waId: string, message: ChatMessage): Promise<void> {
    const session = await store.get(waId);
    if (!session) return;
    session.history.push(message);
    session.updatedAt = Date.now();
    // Limite de historial: mantenemos los últimos 40 mensajes para no superar tokens
    if (session.history.length > 40) {
      session.history = session.history.slice(-40);
    }
    await store.set(session);
  },

  async get(waId: string): Promise<ChatSession | null> {
    return store.get(waId);
  },

  async clear(waId: string): Promise<void> {
    await store.delete(waId);
  },
};
