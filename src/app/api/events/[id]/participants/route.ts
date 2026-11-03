import { NextResponse } from 'next/server';
import { getEvent, createEvent, saveParticipantAvailability, getEventWithHeatmap } from '@/lib/services/eventService';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;

    const body = await request.json();
    const { name, slots, participantId, event: eventData } = body;

    // Self-healing: if the serverless container does not have this event in memory,
    // reconstruct and persist it using the event metadata provided in the request!
    let event = await getEvent(id);
    if (!event && eventData) {
      try {
        event = await createEvent({
          id,
          title: eventData.title || 'Reunión Grupal',
          description: eventData.description,
          type: eventData.type || 'dates',
          dates: Array.isArray(eventData.dates) ? eventData.dates : [],
          startHour: Number(eventData.startHour) || 9,
          endHour: Number(eventData.endHour) || 18,
          slotDuration: Number(eventData.slotDuration) || 30,
        });
      } catch (err) {
        console.warn('Error al auto-reparar evento en API participants:', err);
      }
    }

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }

    if (!Array.isArray(slots)) {
      return NextResponse.json({ error: 'Formato de slots inválido' }, { status: 400 });
    }

    const participant = await saveParticipantAvailability(id, name, slots, participantId);
    const updatedData = await getEventWithHeatmap(id);

    return NextResponse.json({
      participant,
      updatedData,
    });
  } catch (error) {
    console.error('Error al guardar participante:', error);
    return NextResponse.json({ error: 'Error al registrar disponibilidad' }, { status: 500 });
  }
}
