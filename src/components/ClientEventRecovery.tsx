'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, PlusCircle, RefreshCw } from 'lucide-react';

interface ClientEventRecoveryProps {
  eventId: string;
}

export function ClientEventRecovery({ eventId }: ClientEventRecoveryProps) {
  const [recovering, setRecovering] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`disponi_blueprint_${eventId}`);
        if (raw) {
          const bp = JSON.parse(raw);
          const adm = localStorage.getItem(`disponi_adm_${eventId}`);
          const query = new URLSearchParams({
            t: bp.t || '',
            ...(bp.desc ? { desc: bp.desc } : {}),
            m: bp.m || 'dates',
            d: Array.isArray(bp.d) ? bp.d.join(',') : bp.d || '',
            s: String(bp.s || 9),
            e: String(bp.e || 18),
            dur: String(bp.dur || 30),
            ...(adm ? { adm } : {}),
          }).toString();

          window.location.replace(`/event/${eventId}?${query}`);
          return;
        }
      } catch (err) {
        console.warn('Error al intentar autorecuperar evento desde localStorage:', err);
      }
      setRecovering(false);
    }
  }, [eventId]);

  if (recovering) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4 animate-spin">
          <RefreshCw className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Cargando sala...</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Verificando datos del evento en tu navegador...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-sm animate-fade-in">
      <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Evento no encontrado</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
        El enlace que abriste parece estar incompleto o la sala no se encuentra registrada en este servidor.
      </p>
      <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 mb-6 text-left">
        <strong>💡 ¿Recibiste este enlace de otra persona?</strong>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          Pídele al organizador que te vuelva a compartir el enlace generado directamente desde el botón <strong>&quot;Copiar enlace&quot;</strong> o <strong>&quot;WhatsApp&quot;</strong> dentro de la sala.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition shadow-sm cursor-pointer"
      >
        <PlusCircle className="w-4 h-4" /> Crear una nueva reunión
      </Link>
    </div>
  );
}
