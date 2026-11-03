import { getDatabase } from '@/lib/db';
import { Event, EventType, EventWithHeatmap, Participant, SlotAvailability } from '@/types';
import crypto from 'node:crypto';

export interface CreateEventInput {
  title: string;
  description?: string;
  type: EventType;
  dates: string[];
  startHour: number;
  endHour: number;
  slotDuration?: number; // default 30 mins
}

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  type: string;
  dates: string;
  start_hour: number;
  end_hour: number;
  slot_duration: number;
  created_at: string;
}

interface ParticipantRow {
  id: string;
  event_id: string;
  name: string;
  slots: string;
  created_at: string;
  updated_at: string;
}

export function generateTimeSlots(startHour: number, endHour: number, slotDuration: number = 30): string[] {
  const slots: string[] = [];
  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;

  for (let mins = startMinutes; mins < endMinutes; mins += slotDuration) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    slots.push(formatted);
  }

  return slots;
}

function mapEventRow(row: EventRow): Event {
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
  };
}

function mapParticipantRow(row: ParticipantRow): Participant {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    slots: JSON.parse(row.slots || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createEvent(input: CreateEventInput): Event {
  const db = getDatabase();
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  const now = new Date().toISOString();
  const slotDuration = input.slotDuration || 30;

  const stmt = db.prepare(`
    INSERT INTO events (id, title, description, type, dates, start_hour, end_hour, slot_duration, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    input.title.trim(),
    input.description?.trim() || null,
    input.type,
    JSON.stringify(input.dates),
    input.startHour,
    input.endHour,
    slotDuration,
    now
  );

  return {
    id,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    type: input.type,
    dates: input.dates,
    startHour: input.startHour,
    endHour: input.endHour,
    slotDuration,
    createdAt: now,
  };
}

export function getEvent(id: string): Event | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM events WHERE id = ?');
  const row = stmt.get(id) as EventRow | undefined;
  if (!row) return null;
  return mapEventRow(row);
}

export function getEventParticipants(eventId: string): Participant[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM participants WHERE event_id = ? ORDER BY created_at ASC');
  const rows = stmt.all(eventId) as unknown as ParticipantRow[];
  return rows.map(mapParticipantRow);
}

export function getEventWithHeatmap(id: string): EventWithHeatmap | null {
  const event = getEvent(id);
  if (!event) return null;

  const participants = getEventParticipants(id);
  const timeSlots = generateTimeSlots(event.startHour, event.endHour, event.slotDuration);
  const heatmap: Record<string, SlotAvailability> = {};

  const totalParticipants = participants.length;

  // Build slot sets for fast lookup
  const participantMap = participants.map((p) => ({
    name: p.name,
    id: p.id,
    slotSet: new Set(p.slots),
  }));

  for (const dateOrDay of event.dates) {
    for (const time of timeSlots) {
      const slotKey = `${dateOrDay}_${time}`;
      const availableNames: string[] = [];
      const unavailableNames: string[] = [];

      for (const p of participantMap) {
        if (p.slotSet.has(slotKey)) {
          availableNames.push(p.name);
        } else {
          unavailableNames.push(p.name);
        }
      }

      const availableCount = availableNames.length;
      const ratio = totalParticipants > 0 ? availableCount / totalParticipants : 0;

      heatmap[slotKey] = {
        slotKey,
        dateOrDay,
        time,
        availableCount,
        totalParticipants,
        ratio,
        availableNames,
        unavailableNames,
      };
    }
  }

  return {
    event,
    participants,
    heatmap,
    timeSlots,
  };
}

export function saveParticipantAvailability(
  eventId: string,
  name: string,
  slots: string[],
  participantId?: string
): Participant {
  const db = getDatabase();
  const now = new Date().toISOString();
  const trimmedName = name.trim();

  // If participantId is provided, look for that participant
  let existing: ParticipantRow | undefined;
  if (participantId) {
    const stmt = db.prepare('SELECT * FROM participants WHERE id = ? AND event_id = ?');
    existing = stmt.get(participantId, eventId) as ParticipantRow | undefined;
  }

  // Otherwise check if a participant with this name already exists in this event
  if (!existing) {
    const stmt = db.prepare('SELECT * FROM participants WHERE event_id = ? AND LOWER(name) = LOWER(?)');
    existing = stmt.get(eventId, trimmedName) as ParticipantRow | undefined;
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
