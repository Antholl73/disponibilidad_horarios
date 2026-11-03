'use client';

import React, { useState, useEffect } from 'react';
import { EventWithHeatmap, Participant } from '@/types';
import AvailabilityGrid from '@/components/AvailabilityGrid';
import GroupHeatmap from '@/components/GroupHeatmap';
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
  CheckCircle2,
  ArrowRight,
  FileSpreadsheet
} from 'lucide-react';

interface EventRoomClientProps {
  initialData: EventWithHeatmap;
}

export default function EventRoomClient({ initialData }: EventRoomClientProps) {
  const [data, setData] = useState<EventWithHeatmap>(initialData);
  const { event, participants, timeSlots, heatmap } = data;

  const [activeTab, setActiveTab] = useState<'my-schedule' | 'group-schedule'>('my-schedule');
  const [participantName, setParticipantName] = useState('');
  const [localSlots, setLocalSlots] = useState<string[]>([]);
  const [highlightedParticipant, setHighlightedParticipant] = useState<Participant | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notification, setNotification] = useState<{ message: string; showSwitchTab?: boolean } | null>(null);

  // Restore remembered participant name and slots for this event
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem(`disponi_name_${event.id}`);
      if (savedName) {
        setParticipantName(savedName);
      }
      const rawSlots = localStorage.getItem(`disponi_slots_${event.id}`);
      if (rawSlots) {
        try {
          setLocalSlots(JSON.parse(rawSlots));
        } catch {}
      }
    }
  }, [event.id]);

  // Real-time synchronization to fetch other participants' responses without needing to save first
  const refreshEventData = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${event.id}`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.participants)) {
          setData(json);
        }
      }
    } catch (err) {
      console.warn('Error al sincronizar participantes:', err);
    }
  }, [event.id]);

  useEffect(() => {
    refreshEventData();
    const timer = setInterval(refreshEventData, 8000);
    return () => clearInterval(timer);
  }, [refreshEventData]);

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
          event: {
            title: event.title,
            description: event.description,
            type: event.type,
            dates: event.dates,
            startHour: event.startHour,
            endHour: event.endHour,
            slotDuration: event.slotDuration,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Error al guardar disponibilidad');
      }

      if (json.updatedData) {
        setData(json.updatedData);
      } else {
        // Fallback optimistic update
        const updatedParticipants = [...participants];
        const existingIdx = updatedParticipants.findIndex(
          (p) => p.name.trim().toLowerCase() === participantName.trim().toLowerCase()
        );
        if (existingIdx >= 0) {
          updatedParticipants[existingIdx] = {
            ...updatedParticipants[existingIdx],
            slots,
            updatedAt: new Date().toISOString(),
          };
        } else {
          updatedParticipants.push({
            id: json.participant?.id || String(Date.now()),
            eventId: event.id,
            name: participantName.trim(),
            slots,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
        setData((prev) => ({
          ...prev,
          participants: updatedParticipants,
        }));
      }

      // Save name & slots to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(`disponi_name_${event.id}`, participantName.trim());
        localStorage.setItem(`disponi_slots_${event.id}`, JSON.stringify(slots));
      }

      setNotification({
        message: '¡Tus horarios han sido guardados exitosamente!',
        showSwitchTab: true,
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar';
      alert(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/events/${event.id}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || 'No se pudo generar el archivo de Excel.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanTitle = event.title.replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_');
      a.download = `Disponibilidad_${cleanTitle}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al exportar a Excel';
      alert(msg);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Event Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 text-xs font-semibold mb-2">
              <Calendar className="w-3.5 h-3.5" /> Evento Grupal
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {event.title}
            </h1>
            {event.description && (
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
                {event.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-4 text-xs font-medium text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
                <CalendarDays className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                {event.dates.length} {event.type === 'dates' ? 'fechas' : 'días'} seleccionados
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
                <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                {String(event.startHour).padStart(2, '0')}:00 - {String(event.endHour).padStart(2, '0')}:00 ({event.slotDuration} min)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
                <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                {participants.length} {participants.length === 1 ? 'persona ha respondido' : 'personas han respondido'}
              </span>
            </div>
          </div>

          {/* Share & Export Action Box */}
          <div className="flex flex-col gap-2 min-w-[280px]">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Enlace para invitar al grupo:</span>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                readOnly
                value={eventUrl}
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono select-all text-slate-700 dark:text-slate-300 focus:outline-none"
              />
              <button
                type="button"
                onClick={copyToClipboard}
                className="inline-flex items-center gap-1 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium rounded-xl text-xs transition shadow-xs cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Hola! Marquemos nuestros horarios disponibles para "${event.title}" aquí: ${eventUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 transition py-1.5 px-2 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/30"
              >
                <Share2 className="w-3.5 h-3.5" /> WhatsApp
              </a>

              <button
                type="button"
                onClick={handleExportExcel}
                disabled={isExporting}
                title="Descargar matriz y lista de participantes en formato Excel (.xlsx)"
                className="inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition py-1.5 px-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer shadow-2xs"
              >
                {isExporting ? (
                  <div className="w-3.5 h-3.5 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                )}
                <span>Excel (.xlsx)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Days Badges Bar */}
        <div className="pt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Días a evaluar:</span>
          {event.dates.map((d) => (
            <span
              key={d}
              className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 text-indigo-800 dark:text-indigo-300 text-xs font-medium rounded-lg"
            >
              {d}
            </span>
          ))}
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="font-medium">{notification.message}</span>
          </div>

          {notification.showSwitchTab && activeTab === 'my-schedule' && (
            <button
              type="button"
              onClick={() => setActiveTab('group-schedule')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-xs self-start sm:self-auto cursor-pointer"
            >
              Ver disponibilidad grupal <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Main Interactive Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Participant identity & list */}
        <div className="lg:col-span-1 space-y-4">
          {/* Identity Box (Desktop only, mobile has it inside Tab 1) */}
          <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold text-sm mb-3">
              <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              ¿Quién eres tú?
            </div>

            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">
              Tu nombre o apodo:
            </label>
            <input
              type="text"
              placeholder="Tu nombre o alias"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition text-sm text-slate-900 dark:text-white font-medium placeholder-slate-400 dark:placeholder-slate-500"
            />

            {currentParticipant ? (
              <p className="text-emerald-600 dark:text-emerald-400 text-[11px] mt-2 flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" /> Ya has respondido con {currentParticipant.slots.length} bloques. Puedes editarlos.
              </p>
            ) : participantName.trim() ? (
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-2">
                Nuevo participante. Marca tus bloques libres a la derecha.
              </p>
            ) : null}
          </div>

          {/* Group Participants List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold text-sm">
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Respuestas ({participants.length})
              </div>
            </div>

            {participants.length === 0 ? (
              <div className="text-xs text-slate-400 dark:text-slate-500 py-3 text-center">
                Aún nadie ha respondido. ¡Sé el primero en guardar tus horarios!
              </div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {participants.map((p) => {
                  const isCurrent = p.name.trim().toLowerCase() === participantName.trim().toLowerCase();
                  const isHighlighted = highlightedParticipant?.id === p.id;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => {
                        setHighlightedParticipant(isHighlighted && activeTab === 'group-schedule' ? null : p);
                        setActiveTab('group-schedule');
                      }}
                      title="Haz clic para ver los horarios guardados por esta persona"
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition border cursor-pointer ${
                        isHighlighted && activeTab === 'group-schedule'
                          ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
                          : isCurrent
                          ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-semibold'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{p.name} {isCurrent && '(Tú)'}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        isHighlighted && activeTab === 'group-schedule'
                          ? 'bg-indigo-700 text-white border-indigo-600'
                          : 'text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                      }`}>
                        {p.slots.length} bloques
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            {/* View Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => setActiveTab('my-schedule')}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                  activeTab === 'my-schedule'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Marcar mis horas</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('group-schedule')}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                  activeTab === 'group-schedule'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Flame className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Ver grupo ({participants.length})</span>
              </button>
            </div>

            {/* Tab 1: Interactive Grid for the current participant */}
            {activeTab === 'my-schedule' && (
              <div>
                {/* Mobile Participant Name Bar */}
                <div className="sm:hidden mb-4 p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl text-left shadow-2xs">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Tu nombre o apodo:
                  </label>
                  <input
                    type="text"
                    placeholder="Tu nombre o alias"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition text-sm text-slate-900 dark:text-white font-semibold"
                  />
                  {currentParticipant && (
                    <p className="text-emerald-700 dark:text-emerald-400 text-[11px] font-medium mt-1.5">
                      ✓ Horarios guardados previamente ({currentParticipant.slots.length} bloques).
                    </p>
                  )}
                </div>

                {/* Notice if participants already answered */}
                {participants.length > 0 && (
                  <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-900 dark:text-emerald-200">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span>
                        Ya hay <strong>{participants.length}</strong> {participants.length === 1 ? 'persona con horarios guardados' : 'personas con horarios guardados'}. Puedes consultar sus respuestas en cualquier momento.
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('group-schedule')}
                      className="font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 underline text-left sm:text-right flex-shrink-0 cursor-pointer"
                    >
                      Ver disponibilidad grupal ➔
                    </button>
                  </div>
                )}

                {!participantName.trim() && (
                  <div className="hidden sm:flex mb-4 p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs rounded-xl items-center gap-2">
                    <User className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span>
                      Escribe tu nombre en la columna izquierda para poder guardar tus horarios.
                    </span>
                  </div>
                )}

                <AvailabilityGrid
                  event={event}
                  timeSlots={timeSlots}
                  initialSlots={currentParticipant ? currentParticipant.slots : localSlots}
                  participantName={participantName}
                  onSave={handleSaveAvailability}
                  isSaving={isSaving}
                  heatmap={heatmap}
                  totalParticipants={participants.length}
                />
              </div>
            )}

            {/* Tab 2: Group Heatmap */}
            {activeTab === 'group-schedule' && (
              <div>
                {participants.length === 0 ? (
                  <div className="text-center py-12 px-4 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                      <Flame className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                      Aún no hay respuestas en este evento
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
                      Para ver el mapa de calor grupal, comparte el enlace o marca tus horas en la pestaña &quot;Marcar mis horas&quot;.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('my-schedule')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Marcar mis horarios ahora
                    </button>
                  </div>
                ) : (
                  <GroupHeatmap
                    event={event}
                    timeSlots={timeSlots}
                    participants={participants}
                    heatmap={heatmap}
                    highlightedParticipant={highlightedParticipant}
                    onSelectParticipant={setHighlightedParticipant}
                    onExportExcel={handleExportExcel}
                    isExporting={isExporting}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
