import Link from 'next/link';
import { getEventWithHeatmap, createEvent } from '@/lib/services/eventService';
import EventRoomClient from '@/components/EventRoomClient';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ArrowLeft, AlertCircle, PlusCircle } from 'lucide-react';

interface EventPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    t?: string; // title
    desc?: string; // description
    m?: string; // mode: dates | days
    d?: string; // comma-separated dates
    s?: string; // startHour
    e?: string; // endHour
    dur?: string; // slotDuration
    adm?: string; // adminKey
  }>;
}

export default async function EventPage(props: EventPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { id } = params;

  let data = await getEventWithHeatmap(id);

  // Resilient Recovery: If serverless lambda container does not have the event in /tmp,
  // reconstruct and persist it on-demand from URL parameters!
  if (!data && searchParams.t && searchParams.d) {
    try {
      const dates = decodeURIComponent(searchParams.d).split(',').filter(Boolean);
      await createEvent({
        id,
        title: decodeURIComponent(searchParams.t),
        description: searchParams.desc ? decodeURIComponent(searchParams.desc) : undefined,
        type: searchParams.m === 'days' ? 'days' : 'dates',
        dates,
        startHour: Number(searchParams.s) || 9,
        endHour: Number(searchParams.e) || 18,
        slotDuration: Number(searchParams.dur) || 30,
        adminKey: searchParams.adm,
      });
      data = await getEventWithHeatmap(id);
    } catch (e) {
      console.error('Error al recuperar evento desde parámetros de URL:', e);
    }
  }

  // Friendly Fallback screen instead of raw 404
  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Evento no encontrado</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            La sala de reunión que buscas no existe o ha expirado. Puedes crear una nueva reunión en cuestión de segundos.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition"
          >
            <PlusCircle className="w-4 h-4" /> Crear nueva reunión
          </Link>
        </div>
      </div>
    );
  }

  // Check if incoming query parameter matches admin key
  const isIncomingAdmin = Boolean(data.event.adminKey && searchParams.adm && searchParams.adm === data.event.adminKey);

  // Strip adminKey from client props for security
  const safeEvent = { ...data.event };
  delete safeEvent.adminKey;

  const clientData = {
    ...data,
    event: safeEvent,
    isAdmin: isIncomingAdmin,
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-150">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al inicio
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 rounded-full">
              Sala de Coordinación
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Room Component */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <EventRoomClient initialData={clientData} initialAdminKey={searchParams.adm} />
      </main>
    </div>
  );
}
