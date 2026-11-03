export type EventType = 'dates' | 'days';

export interface Event {
  id: string;
  title: string;
  description: string | null;
  type: EventType;
  dates: string[]; // e.g. ["2026-11-05", "2026-11-06"] or ["Lunes", "Martes"]
  startHour: number; // e.g. 9
  endHour: number; // e.g. 18
  slotDuration: number; // in minutes: 30 or 60
  createdAt: string;
}

export interface Participant {
  id: string;
  eventId: string;
  name: string;
  slots: string[]; // list of slot keys: `${dateOrDay}_${time}`
  createdAt: string;
  updatedAt: string;
}

export interface SlotAvailability {
  slotKey: string;
  dateOrDay: string;
  time: string;
  availableCount: number;
  totalParticipants: number;
  ratio: number; // 0.0 to 1.0
  availableNames: string[];
  unavailableNames: string[];
}

export interface EventWithHeatmap {
  event: Event;
  participants: Participant[];
  heatmap: Record<string, SlotAvailability>;
  timeSlots: string[]; // array of formatted times: ["09:00", "09:30", ...]
}
