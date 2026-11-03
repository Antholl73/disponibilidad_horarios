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
  FileSpreadsheet,
  Trash2,
  ShieldCheck,
  KeyRound,
  X,
  AlertCircle
} from 'lucide-react';

interface EventRoomClientProps {
  initialData: EventWithHeatmap;
  initialAdminKey?: string;
}

export default function EventRoomClient({ initialData, initialAdminKey }: EventRoomClientProps) {
  const [data, setData] = useState<EventWithHeatmap>(initialData);
  const { event, participants, timeSlots, heatmap } = data;

  const [activeTab, setActiveTab] = useState<'my-schedule' | 'group-schedule'>('my-schedule');
  const [participantName, setParticipantName] = useState('');
  const [localSlots, setLocalSlots] = useState<string[]>([]);
  const [highlightedParticipant, setHighlightedParticipant] = useState<Participant | null>(null);

  // Authenticated Participant Token & ID
  const [participantToken, setParticipantToken] = useState<string | null>(null);
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null);

  // Admin and Role State
  const [adminKey, setAdminKey] = useState<string | null>(initialAdminKey || null);
  const [isAdmin, setIsAdmin] = useState<boolean>(Boolean(initialData.isAdmin));
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminInput, setAdminInput] = useState('');

  // Delete participant state & confirmation modal
  const [participantToDelete, setParticipantToDelete] = useState<Participant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notification, setNotification] = useState<{ message: string; showSwitchTab?: boolean } | null>(null);

  // Restore remembered participant identity, slots, and admin key for this event
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem(`disponi_token_${event.id}`);
      if (savedToken) {
        setParticipantToken(savedToken);
      }
      const savedPid = localStorage.getItem(`disponi_pid_${event.id}`);
      if (savedPid) {
        setMyParticipantId(savedPid);
      }
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

      // Check stored admin key
      const storedAdm = localStorage.getItem(`disponi_adm_${event.id}`);
      if (storedAdm && !adminKey) {
        setAdminKey(storedAdm);
      }
    }
  }, [event.id, adminKey]);

  // Real-time synchronization to fetch other participants' responses
  const refreshEventData = React.useCallback(async () => {
    try {
      const currentKey = adminKey || (typeof window !== 'undefined' ? localStorage.getItem(`disponi_adm_${event.id}`) : null);
      const headers: HeadersInit = currentKey ? { 'x-admin-key': currentKey } : {};
      const res = await fetch(`/api/events/${event.id}`, { headers });
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.participants)) {
          setData(json);
          if (typeof json.isAdmin === 'boolean') {
            setIsAdmin(json.isAdmin);
          }
        }
      }
    } catch (err) {
      console.warn('Error al sincronizar participantes:', err);
    }
  }, [event.id, adminKey]);

  useEffect(() => {
    refreshEventData();
    const timer = setInterval(refreshEventData, 8000);
    return () => clearInterval(timer);
  }, [refreshEventData]);

  // Store event blueprint in localStorage for instant client-side recovery
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          `disponi_blueprint_${event.id}`,
          JSON.stringify({
            t: event.title,
            desc: event.description,
            m: event.type,
            d: event.dates,
            s: event.startHour,
            e: event.endHour,
            dur: event.slotDuration,
          })
        );
      } catch {}
    }
  }, [event]);

  const shareQuery = React.useMemo(() => {
    return new URLSearchParams({
      t: event.title,
      ...(event.description ? { desc: event.description } : {}),
      m: event.type,
      d: event.dates.join(','),
      s: String(event.startHour),
      e: String(event.endHour),
      dur: String(event.slotDuration),
    }).toString();
  }, [event]);

  const eventUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/event/${event.id}?${shareQuery}`
    : '';

  const copyToClipboard = () => {
    if (!eventUrl) return;
    navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // My own participant record (verified by saved participant ID or token)
  const myParticipant = participants.find((p) => {
    if (myParticipantId && p.id === myParticipantId) return true;
    if (participantToken) {
      const savedName = typeof window !== 'undefined' ? localStorage.getItem(`disponi_name_${event.id}`) : null;
      if (savedName && p.name.trim().toLowerCase() === savedName.trim().toLowerCase()) return true;
    }
    return false;
  });

  // Participant matching the typed name in the input field
  const matchingParticipant = participants.find(
    (p) => p.name.trim().toLowerCase() === participantName.trim().toLowerCase()
  );

  // Is the participant matching the typed name actually ME?
  const isOwnerOfMatchingParticipant = Boolean(
    matchingParticipant && (
      (myParticipantId && matchingParticipant.id === myParticipantId) ||
      (myParticipant && matchingParticipant.id === myParticipant.id) ||
      (participantToken && typeof window !== 'undefined' && localStorage.getItem(`disponi_name_${event.id}`)?.trim().toLowerCase() === matchingParticipant.name.trim().toLowerCase())
    )
  );

  // Detect impersonation / name collision:
  // Someone typed a name that is already in participants, but they DO NOT own that participant record!
  const isImpersonatingOrCollision = Boolean(
    matchingParticipant && !isOwnerOfMatchingParticipant && !isAdmin
  );

  const handleSaveAvailability = async (slots: string[]) => {
    if (!participantName.trim()) {
      alert('Por favor ingresa tu nombre antes de guardar.');
      return;
    }

    if (isImpersonatingOrCollision) {
      alert(`El nombre "${participantName.trim()}" ya ha sido registrado por otro usuario en este evento. Por favor utiliza otro nombre o alias.`);
      return;
    }

    setIsSaving(true);
    try {
      const currentAdm = adminKey || (typeof window !== 'undefined' ? localStorage.getItem(`disponi_adm_${event.id}`) : undefined);
      const currentToken = participantToken || (typeof window !== 'undefined' ? localStorage.getItem(`disponi_token_${event.id}`) : undefined);
      const targetPid = myParticipantId || (isOwnerOfMatchingParticipant ? matchingParticipant?.id : undefined);

      const res = await fetch(`/api/events/${event.id}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: participantName.trim(),
          slots,
          participantId: targetPid,
          participantToken: currentToken || undefined,
          adminKey: currentAdm || undefined,
          event: {
            title: event.title,
            description: event.description,
            type: event.type,
            dates: event.dates,
            startHour: event.startHour,
            endHour: event.endHour,
            slotDuration: event.slotDuration,
            adminKey: currentAdm || undefined,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Error al guardar disponibilidad');
      }

      if (json.participant) {
        if (json.participant.token) {
          setParticipantToken(json.participant.token);
          if (typeof window !== 'undefined') {
            localStorage.setItem(`disponi_token_${event.id}`, json.participant.token);
          }
        }
        if (json.participant.id) {
          setMyParticipantId(json.participant.id);
          if (typeof window !== 'undefined') {
            localStorage.setItem(`disponi_pid_${event.id}`, json.participant.id);
          }
        }
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

  const handleVerifyAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminInput.trim()) return;
    const key = adminInput.trim();

    try {
      const res = await fetch(`/api/events/${event.id}`, {
        headers: { 'x-admin-key': key },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.isAdmin) {
          setAdminKey(key);
          setIsAdmin(true);
          if (typeof window !== 'undefined') {
            localStorage.setItem(`disponi_adm_${event.id}`, key);
          }
          setShowAdminModal(false);
          setAdminInput('');
          setNotification({
            message: '¡Rol de Administrador activado con éxito!',
          });
          setTimeout(() => setNotification(null), 4000);
          return;
        }
      }
      alert('Clave de administrador incorrecta para esta reunión.');
    } catch {
      alert('Error al verificar clave de administrador.');
    }
  };

  const handleDeleteParticipantConfirm = async () => {
    if (!participantToDelete) return;
    setIsDeleting(true);

    try {
      const currentAdm = adminKey || (typeof window !== 'undefined' ? localStorage.getItem(`disponi_adm_${event.id}`) : null);
      const currentToken = participantToken || (typeof window !== 'undefined' ? localStorage.getItem(`disponi_token_${event.id}`) : null);

      const res = await fetch(`/api/events/${event.id}/participants`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: participantToDelete.id,
          participantToken: currentToken || undefined,
          adminKey: currentAdm || undefined,
          participantName: participantName.trim() || undefined,
          event: {
            title: event.title,
            description: event.description,
            type: event.type,
            dates: event.dates,
            startHour: event.startHour,
            endHour: event.endHour,
            slotDuration: event.slotDuration,
            adminKey: currentAdm || undefined,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'No se pudo eliminar el participante');
      }

      if (json.updatedData) {
        setData(json.updatedData);
      } else {
        setData((prev) => ({
          ...prev,
          participants: prev.participants.filter((p) => p.id !== participantToDelete.id),
        }));
      }

      const isSelf =
        participantToDelete.id === myParticipantId ||
        (myParticipant && participantToDelete.id === myParticipant.id) ||
        (Boolean(currentToken) && participantToDelete.name.trim().toLowerCase() === participantName.trim().toLowerCase());

      if (isSelf) {
        setParticipantName('');
        setLocalSlots([]);
        setParticipantToken(null);
        setMyParticipantId(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`disponi_name_${event.id}`);
          localStorage.removeItem(`disponi_slots_${event.id}`);
          localStorage.removeItem(`disponi_token_${event.id}`);
          localStorage.removeItem(`disponi_pid_${event.id}`);
        }
        setNotification({
          message: 'Has retirado tus horarios y abandonado el evento.',
        });
      } else {
        setNotification({
          message: `Participante "${participantToDelete.name}" retirado del calendario.`,
        });
      }

      if (highlightedParticipant?.id === participantToDelete.id) {
        setHighlightedParticipant(null);
      }

      setParticipantToDelete(null);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar participante';
      alert(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Event Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 text-xs font-semibold">
                <Calendar className="w-3.5 h-3.5" /> Evento Grupal
              </span>

              {isAdmin ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 text-xs font-semibold shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Creador (Admin)
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAdminModal(true)}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 underline cursor-pointer ml-1"
                  title="Si eres el creador de este evento, ingresa tu clave para administrar"
                >
                  <KeyRound className="w-3 h-3" /> ¿Eres el creador?
                </button>
              )}
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

            {isImpersonatingOrCollision ? (
              <div className="mt-2.5 pt-2 border-t border-amber-200 dark:border-amber-900/60 flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>
                  El nombre <strong>&quot;{matchingParticipant?.name}&quot;</strong> ya ha sido registrado por otro usuario. Por favor escribe otro nombre o alias.
                </span>
              </div>
            ) : isOwnerOfMatchingParticipant && matchingParticipant ? (
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <Check className="w-3.5 h-3.5" /> {matchingParticipant.slots.length} bloques guardados.
                </span>
                <button
                  type="button"
                  onClick={() => setParticipantToDelete(matchingParticipant)}
                  className="text-rose-600 dark:text-rose-400 hover:underline font-medium cursor-pointer"
                >
                  Retirar mi horario
                </button>
              </div>
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
              {isAdmin && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  Modo Admin
                </span>
              )}
            </div>

            {participants.length === 0 ? (
              <div className="text-xs text-slate-400 dark:text-slate-500 py-3 text-center">
                Aún nadie ha respondido. ¡Sé el primero en guardar tus horarios!
              </div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {participants.map((p) => {
                  const isCurrent = Boolean(
                    (myParticipantId && p.id === myParticipantId) ||
                    (myParticipant && p.id === myParticipant.id) ||
                    (participantToken && typeof window !== 'undefined' && localStorage.getItem(`disponi_name_${event.id}`)?.trim().toLowerCase() === p.name.trim().toLowerCase())
                  );
                  const isHighlighted = highlightedParticipant?.id === p.id;
                  const canDelete = isAdmin || isCurrent;

                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-1 group"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setHighlightedParticipant(isHighlighted && activeTab === 'group-schedule' ? null : p);
                          setActiveTab('group-schedule');
                        }}
                        title="Haz clic para ver los horarios guardados por esta persona"
                        className={`flex-1 text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition border cursor-pointer ${
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

                      {/* Botón de eliminación: el Admin puede eliminar a cualquiera, los invitados solo a sí mismos */}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setParticipantToDelete(p);
                          }}
                          title={isCurrent ? 'Retirar mis horarios del evento' : `Eliminar a ${p.name} (Rol de Admin)`}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer flex-shrink-0"
                          aria-label={`Eliminar a ${p.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
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
                  {isImpersonatingOrCollision ? (
                    <div className="mt-2 pt-1.5 border-t border-amber-200 dark:border-amber-900/60 flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                      <span>
                        El nombre <strong>&quot;{matchingParticipant?.name}&quot;</strong> ya fue registrado por otro usuario. Por favor usa otro nombre.
                      </span>
                    </div>
                  ) : isOwnerOfMatchingParticipant && matchingParticipant ? (
                    <div className="flex items-center justify-between text-[11px] mt-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                        ✓ {matchingParticipant.slots.length} bloques guardados.
                      </span>
                      <button
                        type="button"
                        onClick={() => setParticipantToDelete(matchingParticipant)}
                        className="text-rose-600 dark:text-rose-400 font-semibold hover:underline"
                      >
                        Retirar mi horario
                      </button>
                    </div>
                  ) : null}
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
                  initialSlots={isOwnerOfMatchingParticipant && matchingParticipant ? matchingParticipant.slots : (myParticipant ? myParticipant.slots : localSlots)}
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

      {/* Confirmation Modal for Deletion */}
      {participantToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full shadow-2xl text-left">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {participantToDelete.id === myParticipantId || (myParticipant && participantToDelete.id === myParticipant.id)
                    ? '¿Retirar tu horario?'
                    : `¿Eliminar a ${participantToDelete.name}?`}
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {isAdmin && (participantToDelete.id !== myParticipantId && (!myParticipant || participantToDelete.id !== myParticipant.id))
                    ? 'Acción de Administrador'
                    : 'Acción de Participante'}
                </span>
              </div>
            </div>

            <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed mb-5">
              {participantToDelete.id === myParticipantId || (myParticipant && participantToDelete.id === myParticipant.id)
                ? 'Se borrarán todos tus bloques marcados en este evento y serás retirado de la lista grupal.'
                : `Se eliminarán los ${participantToDelete.slots.length} bloques marcados por ${participantToDelete.name}. El mapa de calor grupal se actualizará de inmediato.`}
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setParticipantToDelete(null)}
                disabled={isDeleting}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleDeleteParticipantConfirm}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white transition shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isDeleting ? 'Eliminando...' : 'Sí, eliminar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Key Modal for Creator Access */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full shadow-2xl text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                Acceso de Administrador
              </div>
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
              Si creaste esta reunión desde otro dispositivo o borraste las cookies, ingresa la clave de administrador para desbloquear las opciones de moderación.
            </p>

            <form onSubmit={handleVerifyAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Clave de Admin:
                </label>
                <input
                  type="password"
                  required
                  placeholder="Pega aquí la clave secreta"
                  value={adminInput}
                  onChange={(e) => setAdminInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm cursor-pointer"
                >
                  Verificar y activar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
