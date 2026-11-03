import { NextResponse } from 'next/server';
import { createEvent } from '@/lib/services/eventService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, type, dates, startHour, endHour, slotDuration } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'El título del evento es obligatorio.' }, { status: 400 });
    }

    if (type !== 'dates' && type !== 'days') {
      return NextResponse.json({ error: 'El tipo debe ser "dates" o "days".' }, { status: 400 });
    }

    if (!Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: 'Debes seleccionar al menos una fecha o día.' }, { status: 400 });
    }

    const sHour = Number(startHour);
    const eHour = Number(endHour);

    if (isNaN(sHour) || isNaN(eHour) || sHour < 0 || eHour > 24 || sHour >= eHour) {
      return NextResponse.json({ error: 'Rango horario no válido.' }, { status: 400 });
    }

    const validDurations = [15, 30, 45, 60];
    const durationNum = Number(slotDuration);
    const finalSlotDuration = validDurations.includes(durationNum) ? durationNum : 30;

    const event = await createEvent({
      title: title.trim(),
      description: description?.trim(),
      type,
      dates,
      startHour: sHour,
      endHour: eHour,
      slotDuration: finalSlotDuration,
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Error creando evento:', error);
    return NextResponse.json({ error: 'Error interno del servidor al crear evento' }, { status: 500 });
  }
}
