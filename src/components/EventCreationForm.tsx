'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  Clock,
  Share2,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  CalendarDays,
  ListFilter,
  CheckCircle2
} from 'lucide-react';

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function EventCreationForm() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<'dates' | 'days'>('dates');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [upcomingDays, setUpcomingDays] = useState<{ dateStr: string; dayName: string; dayNumber: number; monthName: string }[]>([]);

  const [startHour, setStartHour] = useState<number>(9);
  const [endHour, setEndHour] = useState<number>(18);
  const [slotDuration, setSlotDuration] = useState<number>(30);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    const now = new Date();
    const defaultDates: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      defaultDates.push(d.toISOString().split('T')[0]);
    }
    setSelectedDates(defaultDates);

    const list: { dateStr: string; dayName: string; dayNumber: number; monthName: string }[] = [];
    for (let i = 0; i < 21; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' });
      const dayNumber = d.getDate();
      const monthName = d.toLocaleDateString('es-ES', { month: 'short' });
      list.push({ dateStr, dayName, dayNumber, monthName });
    }
    setUpcomingDays(list);
  }, []);

  const toggleDate = (dateStr: string) => {
    if (selectedDates.includes(dateStr)) {
      if (selectedDates.length > 1) {
        setSelectedDates(selectedDates.filter((d) => d !== dateStr));
      }
    } else {
      setSelectedDates([...selectedDates, dateStr].sort());
    }
  };

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleQuickDates = (type: 'next3' | 'week' | 'nextWeek') => {
    const now = new Date();
    const dates: string[] = [];
    if (type === 'next3') {
      for (let i = 1; i <= 3; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        dates.push(d.toISOString().split('T')[0]);
      }
    } else if (type === 'week') {
      for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        dates.push(d.toISOString().split('T')[0]);
      }
    } else if (type === 'nextWeek') {
      for (let i = 7; i < 14; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        dates.push(d.toISOString().split('T')[0]);
      }
    }
    setSelectedDates(dates);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Por favor escribe un título para el evento.');
      return;
    }

    const finalDates = mode === 'dates' ? selectedDates : selectedDays;
    if (finalDates.length === 0) {
      setError('Debes seleccionar al menos una fecha o día.');
      return;
    }

    if (startHour >= endHour) {
      setError('La hora de inicio debe ser menor a la hora de fin.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          type: mode,
          dates: finalDates,
          startHour,
          endHour,
          slotDuration,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ocurrió un error al crear el evento');
      }

      setCreatedEventId(data.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al conectar con el servidor';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const eventUrl = typeof window !== 'undefined' && createdEventId
    ? `${window.location.origin}/event/${createdEventId}`
    : '';

  const copyToClipboard = () => {
    if (!eventUrl) return;
    navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Modal / Alerta de éxito si se acaba de crear */}
      {createdEventId && (
        <div className="mb-8 p-6 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-sm text-left">
          <div className="flex items-center gap-3 text-emerald-800 font-semibold text-lg mb-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            ¡Tu reunión ha sido creada exitosamente!
          </div>
          <p className="text-emerald-700 text-sm mb-4">
            Copia este enlace y compártelo en tu grupo de WhatsApp, Slack o correo para que todos marquen sus horarios libres:
          </p>

          <div className="flex flex-col sm:flex-row items-stretch gap-2 mb-4">
            <input
              type="text"
              readOnly
              value={eventUrl}
              className="flex-1 px-4 py-2.5 bg-white border border-emerald-300 rounded-xl text-slate-800 text-sm font-mono select-all focus:outline-none"
            />
            <button
              onClick={copyToClipboard}
              type="button"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm transition-colors shadow-sm"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" /> ¡Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copiar enlace
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-emerald-200/60">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Hola! Marquemos nuestros horarios disponibles para "${title}" aquí: ${eventUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" /> Compartir en WhatsApp
            </a>

            <button
              onClick={() => router.push(`/event/${createdEventId}`)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
            >
              Ir a la sala del evento <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Formulario de creación */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8 text-left">
        <div className="flex items-center gap-2 text-indigo-600 font-semibold text-sm mb-1">
          <Sparkles className="w-4 h-4" /> Nueva Consulta de Disponibilidad
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">
          Configurar reunión grupal
        </h2>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
            {error}
          </div>
        )}

        {/* Título */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Nombre de la reunión o evento <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Ej: Reunión de Proyecto, Salida del fin de semana, etc."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition text-slate-900 placeholder-slate-400 text-sm"
          />
        </div>

        {/* Descripción */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Descripción o notas (opcional)
          </label>
          <textarea
            rows={2}
            placeholder="Ej: Definiremos los temas pendientes y la fecha de entrega..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition text-slate-900 placeholder-slate-400 text-sm resize-none"
          />
        </div>

        {/* Selector de Modo: Fechas vs Días */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Tipo de días para coordinar
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-4">
            <button
              type="button"
              onClick={() => setMode('dates')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition ${
                mode === 'dates'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-4 h-4" /> Fechas específicas
            </button>
            <button
              type="button"
              onClick={() => setMode('days')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition ${
                mode === 'days'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-4 h-4" /> Días de la semana
            </button>
          </div>

          {/* Opción 1: Fechas específicas */}
          {mode === 'dates' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">
                  Selecciona los días a evaluar ({selectedDates.length} seleccionados):
                </span>
                <div className="flex gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => handleQuickDates('next3')}
                    className="text-indigo-600 hover:text-indigo-800 underline font-medium"
                  >
                    Próximos 3 días
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => handleQuickDates('week')}
                    className="text-indigo-600 hover:text-indigo-800 underline font-medium"
                  >
                    Esta semana
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                {upcomingDays.map((item) => {
                  const isSelected = selectedDates.includes(item.dateStr);
                  return (
                    <button
                      type="button"
                      key={item.dateStr}
                      onClick={() => toggleDate(item.dateStr)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs transition ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="capitalize text-[11px] font-medium opacity-75">{item.dayName}</span>
                      <span className="text-base font-semibold">{item.dayNumber}</span>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500">{item.monthName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Opción 2: Días de la semana recurrentes */}
          {mode === 'days' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">
                  Elige los días de la semana:
                </span>
                <div className="flex gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedDays(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'])}
                    className="text-indigo-600 hover:text-indigo-800 underline font-medium"
                  >
                    Lunes a Viernes
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedDays([...DAYS_OF_WEEK])}
                    className="text-indigo-600 hover:text-indigo-800 underline font-medium"
                  >
                    Todos
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = selectedDays.includes(day);
                  return (
                    <button
                      type="button"
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Rango Horario */}
        <div className="mb-8 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-3">
            <Clock className="w-4 h-4 text-indigo-600" />
            Franja de horarios a consultar
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Hora de inicio</label>
              <select
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <option key={i} value={i} disabled={i >= endHour}>
                    {String(i).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Hora de fin</label>
              <select
                value={endHour}
                onChange={(e) => setEndHour(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {Array.from({ length: 24 }).map((_, i) => {
                  const h = i + 1;
                  return (
                    <option key={h} value={h} disabled={h <= startHour}>
                      {String(h).padStart(2, '0')}:00
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Intervalos</label>
              <select
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value={30}>30 minutos (Recomendado)</option>
                <option value={60}>1 hora</option>
              </select>
            </div>
          </div>
        </div>

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 text-white font-semibold text-sm sm:text-base transition-all shadow-sm hover:shadow flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <CalendarIcon className="w-5 h-5" />
              Crear evento y generar enlace compartido
            </>
          )}
        </button>
      </form>
    </div>
  );
}
