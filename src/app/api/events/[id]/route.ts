import { NextResponse } from 'next/server';
import { getEventWithHeatmap, createEvent } from '@/lib/services/eventService';
import { isCloudStorageEnabled } from '@/lib/storage';

function safeDecode(val: string | null): string {
  if (!val) return '';
  try {
    return decodeURIComponent(val);
  } catch {
    return val;
  }
}

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;
    const url = new URL(request.url);

    let data = await getEventWithHeatmap(id);

    // Self-healing from searchParams if missing on this lambda
    if (!data) {
      const t = url.searchParams.get('t');
      const d = url.searchParams.get('d');
      const adm = url.searchParams.get('adm');
      if (t && d) {
        try {
          await createEvent({
            id,
            title: safeDecode(t),
            description: url.searchParams.get('desc') ? safeDecode(url.searchParams.get('desc')) : undefined,
            type: url.searchParams.get('m') === 'days' ? 'days' : 'dates',
            dates: safeDecode(d).split(',').filter(Boolean),
            startHour: Number(url.searchParams.get('s')) || 9,
            endHour: Number(url.searchParams.get('e')) || 18,
            slotDuration: Number(url.searchParams.get('dur')) || 30,
            adminKey: adm || undefined,
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

    // Verificar si el solicitante es Administrador
    const incomingKey = request.headers.get('x-admin-key') || url.searchParams.get('adm');
    const isAdmin = Boolean(data.event.adminKey && incomingKey && incomingKey === data.event.adminKey);

    // No filtrar la clave admin al público por seguridad
    const safeEvent = { ...data.event };
    delete safeEvent.adminKey;

    return NextResponse.json({
      ...data,
      event: safeEvent,
      isAdmin,
      isCloudStorage: isCloudStorageEnabled(),
    });
  } catch (error) {
    console.error('Error al obtener evento:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
