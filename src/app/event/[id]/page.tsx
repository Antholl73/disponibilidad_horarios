import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEventWithHeatmap } from '@/lib/services/eventService';
import EventRoomClient from '@/components/EventRoomClient';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface EventPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventPage(props: EventPageProps) {
  const params = await props.params;
  const { id } = params;

  const data = getEventWithHeatmap(id);

  if (!data) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al inicio
          </Link>

          <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full">
            Sala de Coordinación
          </span>
        </div>
      </header>

      {/* Main Room Component */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <EventRoomClient initialData={data} />
      </main>
    </div>
  );
}
