import { NextResponse } from 'next/server';
import { getEvent, saveParticipantAvailability, getEventWithHeatmap } from '@/lib/services/eventService';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;

    const event = await getEvent(id);
    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { name, slots, participantId } = body;

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
