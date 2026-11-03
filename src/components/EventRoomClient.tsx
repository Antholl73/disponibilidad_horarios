'use client';

import React, { useState, useEffect } from 'react';
import { EventWithHeatmap } from '@/types';
import AvailabilityGrid from '@/components/AvailabilityGrid';
import {
  Calendar,
  Clock,
  Users,
  Copy,
  Check,
  Share2,
  CalendarDays,
  User,
  Sparkles,
  Flame,
  CheckCircle2
} from 'lucide-react';

interface EventRoomClientProps {
  initialData: EventWithHeatmap;
}

export default function EventRoomClient({ initialData }: EventRoomClientProps) {
  const [data, setData] = useState<EventWithHeatmap>(initialData);
  const { event, participants, timeSlots } = data;

  const [activeTab, setActiveTab] = useState<'my-schedule' | 'group-schedule'>('my-schedule');
  const [participantName, setParticipantName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Restore remembered participant name for this event
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem(`disponi_name_${event.id}`);
      if (savedName) {
        setParticipantName(savedName);
      }
    }
  }, [event.id]);

  const eventUrl = typeof window !== 'undefined' ? window.location.href : '';

  const copyToClipboard = () => {
    if (!eventUrl) return;
    navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Find existing participant if the typed name matches
  const currentParticipant = participants.find(
    (p) => p.name.trim().toLowerCase() === participantName.trim().toLowerCase()
  );

  const handleSaveAvailability = async (slots: string[]) => {
    if (!participantName.trim()) {
      alert('Por favor ingresa tu nombre antes de guardar.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/events/${event.id}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: participantName.trim(),
          slots,
          participantId: currentParticipant?.id,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Error al guardar disponibilidad');
      }

      if (json.updatedData) {
        setData(json.updatedData);
      }

      // Save name to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(`disponi_name_${event.id}`, participantName.trim());
      }

      setNotification('¡Tus horarios han sido guardados exitosamente!');
      setTimeout(() => setNotification(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar';
      alert(msg);
    } finally {
      setIsSaving(false);
    }
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
                {String(event.startHour).padStart(2, '0')}:00 - {String(event.endHour).padStart(2, '0')}:00 (intervalos de {event.slotDuration} min)
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

      {/* Notification Toast */}
      {notification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl flex items-center gap-2 shadow-2xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          {notification}
        </div>
      )}

      {/* Main Interactive Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Participant identity & list */}
        <div className="lg:col-span-1 space-y-4">
          {/* Identity Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm mb-3">
              <User className="w-4 h-4 text-indigo-600" />
              ¿Quién eres tú?
            </div>

            <label className="block text-xs text-slate-500 mb-1.5">
              Tu nombre o apodo:
            </label>
            <input
              type="text"
              placeholder="Ej: Anthony"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition text-sm text-slate-900 font-medium placeholder-slate-400"
            />

            {currentParticipant ? (
              <p className="text-emerald-600 text-[11px] mt-2 flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" /> Ya has respondido con {currentParticipant.slots.length} bloques. Puedes editarlos.
              </p>
            ) : participantName.trim() ? (
              <p className="text-slate-500 text-[11px] mt-2">
                Nuevo participante. Marca tus bloques libres a la derecha.
              </p>
            ) : null}
          </div>

          {/* Group Participants List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <Users className="w-4 h-4 text-indigo-600" />
                Respuestas ({participants.length})
              </div>
            </div>

            {participants.length === 0 ? (
              <div className="text-xs text-slate-400 py-3 text-center">
                Aún nadie ha respondido. ¡Sé el primero en guardar tus horarios!
              </div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {participants.map((p) => {
                  const isCurrent = p.name.trim().toLowerCase() === participantName.trim().toLowerCase();
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setParticipantName(p.name)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition border ${
                        isCurrent
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-semibold'
                          : 'bg-slate-50 border-transparent hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="truncate">{p.name} {isCurrent && '(Tú)'}</span>
                      <span className="text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {p.slots.length} horas
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Availability Grid & Tabs */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            {/* View Switcher Tabs */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('my-schedule')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                    activeTab === 'my-schedule'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Sparkles className="w-4 h-4" /> Marcar mis horarios libres
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('group-schedule')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                    activeTab === 'group-schedule'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Flame className="w-4 h-4" /> Ver disponibilidad del grupo
                </button>
              </div>
            </div>

            {/* Tab 1: Interactive Grid for the current participant */}
            {activeTab === 'my-schedule' && (
              <div>
                {!participantName.trim() && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2">
                    <User className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>
                      Escribe tu nombre en la columna izquierda para poder guardar tus horarios.
                    </span>
                  </div>
                )}

                <AvailabilityGrid
                  event={event}
                  timeSlots={timeSlots}
                  initialSlots={currentParticipant ? currentParticipant.slots : []}
                  participantName={participantName}
                  onSave={handleSaveAvailability}
                  isSaving={isSaving}
                />
              </div>
            )}

            {/* Tab 2: Group Availability Preview (will become the full heatmap in Phase 4) */}
            {activeTab === 'group-schedule' && (
              <div className="text-center py-10">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <Flame className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  Disponibilidad grupal agregada
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
                  {participants.length === 0
                    ? 'Aún no hay respuestas registradas. Cuando los miembros marquen sus horas, aquí se creará automáticamente el mapa de calor.'
                    : `Actualmente hay ${participants.length} participante(s) registrado(s).`}
                </p>

                {participants.length > 0 && (
                  <div className="inline-flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                    {participants.map((p) => (
                      <span
                        key={p.id}
                        className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg"
                      >
                        ✓ {p.name} ({p.slots.length} bloques marcados)
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
