import {
  saveEventRecord,
  getEventRecord,
  getParticipantsRecord,
  saveParticipantRecord,
} from '@/lib/storage';
import { Event, EventType, EventWithHeatmap, Participant, SlotAvailability } from '@/types';
import crypto from 'node:crypto';

export interface CreateEventInput {
  id?: string;
  title: string;
  description?: string;
  type: EventType;
  dates: string[];
  startHour: number;
  endHour: number;
  slotDuration?: number; // 15, 30, 45, 60
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

export async function createEvent(input: CreateEventInput): Promise<Event> {
  const id = input.id || crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  const now = new Date().toISOString();
  const slotDuration = input.slotDuration || 30;

  const event: Event = {
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

  await saveEventRecord(event);
  return event;
}

export async function getEvent(id: string): Promise<Event | null> {
  return await getEventRecord(id);
}

export async function getEventParticipants(eventId: string): Promise<Participant[]> {
  return await getParticipantsRecord(eventId);
}

export async function getEventWithHeatmap(id: string): Promise<EventWithHeatmap | null> {
  const event = await getEvent(id);
  if (!event) return null;

  const participants = await getEventParticipants(id);
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

export async function saveParticipantAvailability(
  eventId: string,
  name: string,
  slots: string[],
  participantId?: string
): Promise<Participant> {
  return await saveParticipantRecord(eventId, name, slots, participantId);
}
