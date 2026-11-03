'use client';

import React, { useState } from 'react';
import { EventWithHeatmap } from '@/types';
import {
  Calendar,
  Clock,
  Users,
  Copy,
  Check,
  Share2,
  CalendarDays,
  Sparkles
} from 'lucide-react';

interface EventRoomClientProps {
  initialData: EventWithHeatmap;
}

export default function EventRoomClient({ initialData }: EventRoomClientProps) {
  const { event, participants, timeSlots } = initialData;
  const [copied, setCopied] = useState(false);

  const eventUrl = typeof window !== 'undefined' ? window.location.href : '';

  const copyToClipboard = () => {
    if (!eventUrl) return;
    navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Event Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2">
              <Calendar className="w-3.5 h-3.5" /> Evento Grupal
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {event.title}
            </h1>
            {event.description && (
              <p className="text-slate-600 text-sm mt-1 max-w-2xl leading-relaxed">
                {event.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-4 text-xs font-medium text-slate-600">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg">
                <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                {event.dates.length} {event.type === 'dates' ? 'fechas' : 'días'} seleccionados
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                {String(event.startHour).padStart(2, '0')}:00 - {String(event.endHour).padStart(2, '0')}:00 (bloques de {event.slotDuration} min)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                {participants.length} {participants.length === 1 ? 'persona ha respondido' : 'personas han respondido'}
              </span>
            </div>
          </div>

          {/* Share Action Box */}
          <div className="flex flex-col gap-2 min-w-[280px]">
            <span className="text-xs font-semibold text-slate-700">Enlace para invitar al grupo:</span>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                readOnly
                value={eventUrl}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono select-all text-slate-700 focus:outline-none"
              />
              <button
                type="button"
                onClick={copyToClipboard}
                className="inline-flex items-center gap-1 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium rounded-xl text-xs transition shadow-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Hola! Marquemos nuestros horarios disponibles para "${event.title}" aquí: ${eventUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 transition py-1"
            >
              <Share2 className="w-3.5 h-3.5" /> Enviar por WhatsApp
            </a>
          </div>
        </div>

        {/* Days Badges Bar */}
        <div className="pt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Días a evaluar:</span>
          {event.dates.map((d) => (
            <span
              key={d}
              className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-800 text-xs font-medium rounded-lg"
            >
              {d}
            </span>
          ))}
        </div>
      </div>

      {/* Fase 2 Ready Card - Preview of columns and times */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Vista Previa de la Sala de Coordinación
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              La sala está lista y configurada con {event.dates.length} columnas de días y {timeSlots.length} franjas horarias por día.
            </p>
          </div>
        </div>

        {/* Schedule Grid Skeleton Preview */}
        <div className="overflow-x-auto pb-2">
          <div className="inline-block min-w-full align-middle">
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              {/* Header Row */}
              <div
                className="grid bg-slate-100 border-b border-slate-200 text-center text-xs font-semibold text-slate-700"
                style={{ gridTemplateColumns: `80px repeat(${event.dates.length}, minmax(110px, 1fr))` }}
              >
                <div className="p-2.5 border-r border-slate-200 bg-slate-200/60 flex items-center justify-center text-slate-500">
                  Hora
                </div>
                {event.dates.map((date) => (
                  <div key={date} className="p-2.5 border-r last:border-r-0 border-slate-200">
                    {date}
                  </div>
                ))}
              </div>

              {/* Time Slot Rows Preview (first few slots) */}
              <div className="divide-y divide-slate-200 text-xs">
                {timeSlots.slice(0, 8).map((time) => (
                  <div
                    key={time}
                    className="grid text-center"
                    style={{ gridTemplateColumns: `80px repeat(${event.dates.length}, minmax(110px, 1fr))` }}
                  >
                    <div className="p-2 font-mono text-[11px] text-slate-500 bg-slate-100/60 border-r border-slate-200 flex items-center justify-center">
                      {time}
                    </div>
                    {event.dates.map((date) => (
                      <div
                        key={`${date}_${time}`}
                        className="p-2 border-r last:border-r-0 border-slate-200 bg-white hover:bg-indigo-50/50 transition cursor-default flex items-center justify-center text-[11px] text-slate-400"
                      >
                        -
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            {timeSlots.length > 8 && (
              <div className="text-center text-[11px] text-slate-400 mt-2 italic">
                ... y {timeSlots.length - 8} franjas horarias más configuradas para este evento.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
