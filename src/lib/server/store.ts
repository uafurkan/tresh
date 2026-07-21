import type { Threshold } from '@/lib/pairs';

/**
 * Abonelik deposu. Upstash Redis REST env'leri doluysa kalıcı,
 * değilse bellek-içi (geliştirme) çalışır. İleride Supabase/Postgres'e
 * geçiş için tek değişecek yer burasıdır.
 */

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface Watcher {
  id: string; // abonelik kimliği (endpoint hash'i)
  subscription: PushSubscriptionJSON;
  thresholds: Threshold[];
  /** Eşik id -> son bilinen kur (geçiş tespiti için). */
  lastRates: Record<string, number>;
  /** Bildirim dili ('en' | 'tr'); eski kayıtlarda olmayabilir. */
  locale?: string;
  updatedAt: number;
}

interface Repository {
  getAll(): Promise<Watcher[]>;
  get(id: string): Promise<Watcher | null>;
  put(w: Watcher): Promise<void>;
  remove(id: string): Promise<void>;
}

const KEY_PREFIX = 'tresh:watcher:';
const INDEX_KEY = 'tresh:watchers';

class UpstashRepository implements Repository {
  constructor(private url: string, private token: string) {}

  private async cmd(command: unknown[]): Promise<any> {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(`Upstash: ${data.error}`);
    return data.result;
  }

  async getAll(): Promise<Watcher[]> {
    const ids: string[] = (await this.cmd(['SMEMBERS', INDEX_KEY])) ?? [];
    if (ids.length === 0) return [];
    const raw: (string | null)[] = await this.cmd(['MGET', ...ids.map((i) => KEY_PREFIX + i)]);
    return raw.filter(Boolean).map((r) => JSON.parse(r as string));
  }

  async get(id: string): Promise<Watcher | null> {
    const raw = await this.cmd(['GET', KEY_PREFIX + id]);
    return raw ? JSON.parse(raw) : null;
  }

  async put(w: Watcher): Promise<void> {
    await this.cmd(['SET', KEY_PREFIX + w.id, JSON.stringify(w)]);
    await this.cmd(['SADD', INDEX_KEY, w.id]);
  }

  async remove(id: string): Promise<void> {
    await this.cmd(['DEL', KEY_PREFIX + id]);
    await this.cmd(['SREM', INDEX_KEY, id]);
  }
}

class MemoryRepository implements Repository {
  private map = new Map<string, Watcher>();
  async getAll() { return [...this.map.values()]; }
  async get(id: string) { return this.map.get(id) ?? null; }
  async put(w: Watcher) { this.map.set(w.id, w); }
  async remove(id: string) { this.map.delete(id); }
}

declare global {
  // eslint-disable-next-line no-var
  var __treshRepo: Repository | undefined;
}

/** Kopyala-yapıştırdan kalan görünmez boşluk/satır sonu ya da yanlışlıkla
 * dahil olmuş çevreleyen tırnaklar Upstash'ten "401 Unauthorized" olarak
 * geri dönüyordu (CRON_SECRET'ta daha önce yaşanan aynı sınıf hata). */
function cleanEnv(v: string | undefined): string | undefined {
  const trimmed = v?.trim();
  if (!trimmed) return trimmed;
  return trimmed.replace(/^['"]|['"]$/g, '');
}

export function getRepository(): Repository {
  if (!globalThis.__treshRepo) {
    const url = cleanEnv(process.env.UPSTASH_REDIS_REST_URL);
    const token = cleanEnv(process.env.UPSTASH_REDIS_REST_TOKEN);
    globalThis.__treshRepo = url && token ? new UpstashRepository(url, token) : new MemoryRepository();
  }
  return globalThis.__treshRepo;
}

export async function watcherIdFromEndpoint(endpoint: string): Promise<string> {
  const data = new TextEncoder().encode(endpoint);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Buffer.from(digest).toString('hex').slice(0, 24);
}
