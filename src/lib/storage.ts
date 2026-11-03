import { Redis } from '@upstash/redis';
import { getDatabase } from '@/lib/db';
import { Event, EventType, Participant } from '@/types';
import crypto from 'node:crypto';

function getRedisClient(): Redis | null {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (redisUrl && redisToken) {
    try {
      return new Redis({
        url: redisUrl,
        token: redisToken,
      });
    } catch (err) {
      console.warn('No se pudo inicializar Redis de Upstash, recurriendo a almacenamiento local:', err);
      return null;
    }
  }
  return null;
}

export function isCloudStorageEnabled(): boolean {
  return getRedisClient() !== null;
}

// -------------------------------------------------------------
// EVENT OPERATIONS
// -------------------------------------------------------------

export async function saveEventRecord(event: Event): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    await redis.set(`event:${event.id}`, JSON.stringify(event));
    return;
  }

  // SQLite fallback
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO events (id, title, description, type, dates, start_hour, end_hour, slot_duration, created_at, admin_key)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    event.id,
    event.title,
    event.description || null,
    event.type,
    JSON.stringify(event.dates),
    event.startHour,
    event.endHour,
    event.slotDuration,
    event.createdAt,
    event.adminKey || null
  );
}

export async function getEventRecord(id: string): Promise<Event | null> {
  const redis = getRedisClient();
  if (redis) {
    const raw = await redis.get<string | Event>(`event:${id}`);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }

  // SQLite fallback
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM events WHERE id = ?');
  const row = stmt.get(id) as {
    id: string;
    title: string;
    description: string | null;
    type: string;
    dates: string;
    start_hour: number;
    end_hour: number;
    slot_duration: number;
    created_at: string;
    admin_key?: string | null;
  } | undefined;

  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type as EventType,
    dates: JSON.parse(row.dates || '[]'),
    startHour: row.start_hour,
    endHour: row.end_hour,
    slotDuration: row.slot_duration,
    createdAt: row.created_at,
    adminKey: row.admin_key || undefined,
  };
}

// -------------------------------------------------------------
// PARTICIPANT OPERATIONS
// -------------------------------------------------------------

export async function getParticipantsRecord(eventId: string): Promise<Participant[]> {
  const redis = getRedisClient();
  if (redis) {
    const raw = await redis.get<string | Participant[]>(`participants:${eventId}`);
    if (!raw) return [];
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }

  // SQLite fallback
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM participants WHERE event_id = ? ORDER BY created_at ASC');
  const rows = stmt.all(eventId) as unknown as {
    id: string;
    event_id: string;
    name: string;
    slots: string;
    created_at: string;
    updated_at: string;
  }[];

  return rows.map((r) => ({
    id: r.id,
    eventId: r.event_id,
    name: r.name,
    slots: JSON.parse(r.slots || '[]'),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function saveParticipantRecord(
  eventId: string,
  name: string,
  slots: string[],
  participantId?: string
): Promise<Participant> {
  const trimmedName = name.trim();
  const now = new Date().toISOString();
  const redis = getRedisClient();

  if (redis) {
    const participants = await getParticipantsRecord(eventId);
    let existingIndex = -1;

    if (participantId) {
      existingIndex = participants.findIndex((p) => p.id === participantId);
    }
    if (existingIndex === -1) {
      existingIndex = participants.findIndex(
        (p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );
    }

    if (existingIndex >= 0) {
      const updated: Participant = {
        ...participants[existingIndex],
        name: trimmedName,
        slots,
        updatedAt: now,
      };
      participants[existingIndex] = updated;
      await redis.set(`participants:${eventId}`, JSON.stringify(participants));
      return updated;
    }

    const newParticipant: Participant = {
      id: crypto.randomUUID(),
      eventId,
      name: trimmedName,
      slots,
      createdAt: now,
      updatedAt: now,
    };
    participants.push(newParticipant);
    await redis.set(`participants:${eventId}`, JSON.stringify(participants));
    return newParticipant;
  }

  // SQLite fallback
  const db = getDatabase();
  let existing: { id: string; created_at: string } | undefined;

  if (participantId) {
    const stmt = db.prepare('SELECT id, created_at FROM participants WHERE id = ? AND event_id = ?');
    existing = stmt.get(participantId, eventId) as { id: string; created_at: string } | undefined;
  }

  if (!existing) {
    const stmt = db.prepare('SELECT id, created_at FROM participants WHERE event_id = ? AND LOWER(name) = LOWER(?)');
    existing = stmt.get(eventId, trimmedName) as { id: string; created_at: string } | undefined;
  }

  if (existing) {
    const updateStmt = db.prepare(`
      UPDATE participants 
      SET name = ?, slots = ?, updated_at = ?
      WHERE id = ?
    `);
    updateStmt.run(trimmedName, JSON.stringify(slots), now, existing.id);

    return {
      id: existing.id,
      eventId,
      name: trimmedName,
      slots,
      createdAt: existing.created_at,
      updatedAt: now,
    };
  }

  const newId = crypto.randomUUID();
  const insertStmt = db.prepare(`
    INSERT INTO participants (id, event_id, name, slots, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertStmt.run(newId, eventId, trimmedName, JSON.stringify(slots), now, now);

  return {
    id: newId,
    eventId,
    name: trimmedName,
    slots,
    createdAt: now,
    updatedAt: now,
  };
}

export async function deleteParticipantRecord(eventId: string, participantId: string): Promise<boolean> {
  const redis = getRedisClient();
  if (redis) {
    const participants = await getParticipantsRecord(eventId);
    const initialLen = participants.length;
    const filtered = participants.filter((p) => p.id !== participantId);
    if (filtered.length !== initialLen) {
      await redis.set(`participants:${eventId}`, JSON.stringify(filtered));
      return true;
    }
    return false;
  }

  // SQLite fallback
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM participants WHERE id = ? AND event_id = ?');
  const result = stmt.run(participantId, eventId) as { changes?: number };
  return Boolean(result && typeof result.changes === 'number' ? result.changes > 0 : true);
}
