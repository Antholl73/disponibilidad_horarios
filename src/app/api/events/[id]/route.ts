import { NextResponse } from 'next/server';
import { getEventWithHeatmap, createEvent } from '@/lib/services/eventService';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;

    let data = await getEventWithHeatmap(id);

    // Self-healing from searchParams if missing on this lambda
    if (!data) {
      const url = new URL(request.url);
      const t = url.searchParams.get('t');
      const d = url.searchParams.get('d');
      if (t && d) {
        try {
          await createEvent({
            id,
            title: decodeURIComponent(t),
            description: url.searchParams.get('desc') ? decodeURIComponent(url.searchParams.get('desc')!) : undefined,
            type: url.searchParams.get('m') === 'days' ? 'days' : 'dates',
            dates: decodeURIComponent(d).split(',').filter(Boolean),
            startHour: Number(url.searchParams.get('s')) || 9,
            endHour: Number(url.searchParams.get('e')) || 18,
            slotDuration: Number(url.searchParams.get('dur')) || 30,
          });
          data = await getEventWithHeatmap(id);
        } catch (err) {
          console.warn('Error al autoreparar evento en GET /api/events/[id]:', err);
        }
      }
    }

    if (!data) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error al obtener evento:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
