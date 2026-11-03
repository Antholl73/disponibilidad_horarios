import { NextRequest, NextResponse } from 'next/server';
import { getEventWithHeatmap } from '@/lib/services/eventService';
import { generateEventExcel } from '@/lib/services/excelService';
import { EventWithHeatmap } from '@/types';

function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
    .replace(/[^a-zA-Z0-9_\- ]/g, '') // Quitar caracteres raros
    .trim()
    .replace(/\s+/g, '_') || 'Disponibilidad';
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    let eventData: EventWithHeatmap | null = null;

    try {
      const body = await req.json();
      if (body && body.event && Array.isArray(body.participants) && body.heatmap) {
        eventData = body as EventWithHeatmap;
      }
    } catch {
      // Body vacío o no parseable, intentar desde la base de datos
    }

    if (!eventData) {
      eventData = await getEventWithHeatmap(id);
    }

    if (!eventData) {
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    const buffer = await generateEventExcel(eventData);
    const filename = `Disponibilidad_${sanitizeFilename(eventData.event.title)}.xlsx`;

    return new Response(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: unknown) {
    console.error('Error al generar archivo de Excel:', error);
    const msg = error instanceof Error ? error.message : 'Error interno al exportar';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const eventData = await getEventWithHeatmap(id);

    if (!eventData) {
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    const buffer = await generateEventExcel(eventData);
    const filename = `Disponibilidad_${sanitizeFilename(eventData.event.title)}.xlsx`;

    return new Response(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: unknown) {
    console.error('Error al exportar Excel (GET):', error);
    return NextResponse.json({ error: 'Error al exportar archivo' }, { status: 500 });
  }
}
