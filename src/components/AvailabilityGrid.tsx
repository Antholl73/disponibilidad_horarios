'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Event } from '@/types';
import {
  Check,
  CheckCheck,
  Sparkles,
  Info,
  Hand,
  Paintbrush
} from 'lucide-react';

interface AvailabilityGridProps {
  event: Event;
  timeSlots: string[];
  initialSlots?: string[];
  participantName: string;
  onSave: (slots: string[]) => Promise<void>;
  isSaving: boolean;
}

export default function AvailabilityGrid({
  event,
  timeSlots,
  initialSlots = [],
  participantName,
  onSave,
  isSaving,
}: AvailabilityGridProps) {
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(() => new Set(initialSlots));
  const [hasChanges, setHasChanges] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Mobile mode: 'scroll' allows native swipe/scroll and tap to select; 'paint' allows continuous drag painting
  const [mobileMode, setMobileMode] = useState<'scroll' | 'paint'>('scroll');

  // Sync initialSlots when switching participant or reloading
  useEffect(() => {
    setSelectedSlots(new Set(initialSlots));
    setHasChanges(false);
  }, [initialSlots]);

  // Drag interaction state
  const isDraggingRef = useRef(false);
  const dragModeRef = useRef<'add' | 'remove' | null>(null);

  const startDrag = (slotKey: string) => {
    isDraggingRef.current = true;
    const isAlreadySelected = selectedSlots.has(slotKey);
    const mode = isAlreadySelected ? 'remove' : 'add';
    dragModeRef.current = mode;

    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (mode === 'add') {
        next.add(slotKey);
      } else {
        next.delete(slotKey);
      }
      return next;
    });
    setHasChanges(true);
    setSavedSuccess(false);
  };

  const handleMouseEnter = (slotKey: string) => {
    if (!isDraggingRef.current || !dragModeRef.current) return;

    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (dragModeRef.current === 'add') {
        next.add(slotKey);
      } else {
        next.delete(slotKey);
      }
      return next;
    });
    setHasChanges(true);
  };

  const stopDrag = useCallback(() => {
    isDraggingRef.current = false;
    dragModeRef.current = null;
  }, []);

  // Handle global mouse up to stop dragging if mouse leaves grid
  useEffect(() => {
    window.addEventListener('mouseup', stopDrag);
    return () => window.removeEventListener('mouseup', stopDrag);
  }, [stopDrag]);

  // Mobile Touch Drag support (active when in 'paint' mode)
  const handleTouchMove = (e: React.TouchEvent) => {
    if (mobileMode !== 'paint' || !isDraggingRef.current || !dragModeRef.current) return;
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const slotKey = element?.getAttribute('data-slot');
    if (slotKey) {
      setSelectedSlots((prev) => {
        const next = new Set(prev);
        if (dragModeRef.current === 'add') {
          next.add(slotKey);
        } else {
          next.delete(slotKey);
        }
        return next;
      });
      setHasChanges(true);
    }
  };

  // Quick action helpers
  const handleSelectAll = () => {
    const all = new Set<string>();
    for (const d of event.dates) {
      for (const t of timeSlots) {
        all.add(`${d}_${t}`);
      }
    }
    setSelectedSlots(all);
    setHasChanges(true);
  };

  const handleClearAll = () => {
    setSelectedSlots(new Set());
    setHasChanges(true);
  };

  const handleToggleColumn = (date: string) => {
    const columnSlots = timeSlots.map((t) => `${date}_${t}`);
    const allSelected = columnSlots.every((s) => selectedSlots.has(s));

    setSelectedSlots((prev) => {
      const next = new Set(prev);
      for (const s of columnSlots) {
        if (allSelected) {
          next.delete(s);
        } else {
          next.add(s);
        }
      }
      return next;
    });
    setHasChanges(true);
  };

  const handleSaveClick = async () => {
    await onSave(Array.from(selectedSlots));
    setHasChanges(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  return (
    <div className="select-none pb-20 sm:pb-0">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-slate-50 p-3 sm:p-3.5 rounded-2xl border border-slate-200/80">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Info className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <span className="hidden sm:inline">
            Haz <strong>clic y arrastra</strong> sobre los bloques para marcar o desmarcar tus horas disponibles.
          </span>
          <span className="sm:hidden">
            Toca o arrastra para marcar tus horas disponibles.
          </span>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          {/* Mobile Mode Switcher */}
          <div className="flex sm:hidden items-center bg-slate-200/70 p-1 rounded-xl text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setMobileMode('scroll')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
                mobileMode === 'scroll'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              <Hand className="w-3.5 h-3.5" /> Tocar
            </button>
            <button
              type="button"
              onClick={() => setMobileMode('paint')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
                mobileMode === 'paint'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              <Paintbrush className="w-3.5 h-3.5" /> Pintar
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-2xs"
            >
              Marcar todo
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-red-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-2xs"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Grid Container with Sticky Column & Row */}
      <div
        className={`overflow-x-auto pb-4 cursor-pointer rounded-2xl border border-slate-300 shadow-xs bg-white ${
          mobileMode === 'paint' ? 'touch-none' : 'touch-pan-x touch-pan-y'
        }`}
        onTouchMove={handleTouchMove}
        onTouchEnd={stopDrag}
      >
        <div className="inline-block min-w-full align-middle">
          {/* Day Header Row */}
          <div
            className="grid bg-slate-100 border-b border-slate-300 text-center text-xs font-semibold text-slate-700 sticky top-0 z-20"
            style={{ gridTemplateColumns: `70px repeat(${event.dates.length}, minmax(100px, 1fr))` }}
          >
            {/* Sticky Top-Left Corner */}
            <div className="p-2.5 border-r border-slate-300 bg-slate-200/90 sticky left-0 z-30 flex items-center justify-center text-slate-600 font-mono text-[11px] shadow-xs">
              Hora
            </div>
            {event.dates.map((date) => (
              <div
                key={date}
                onClick={() => handleToggleColumn(date)}
                title="Toca para seleccionar/deseleccionar todo este día"
                className="p-2.5 border-r last:border-r-0 border-slate-300 hover:bg-indigo-50/80 active:bg-indigo-100 transition cursor-pointer flex flex-col items-center justify-center"
              >
                <span className="truncate max-w-[120px] font-bold">{date}</span>
                <span className="text-[10px] text-indigo-600 font-normal hover:underline">Alternar</span>
              </div>
            ))}
          </div>

          {/* Time Slot Rows */}
          <div className="divide-y divide-slate-200 text-xs">
            {timeSlots.map((time) => (
              <div
                key={time}
                className="grid text-center"
                style={{ gridTemplateColumns: `70px repeat(${event.dates.length}, minmax(100px, 1fr))` }}
              >
                {/* Sticky Left Column: Time label */}
                <div className="p-2 font-mono text-[11px] text-slate-600 bg-slate-100/95 sticky left-0 z-10 border-r border-slate-300 flex items-center justify-center shadow-xs">
                  {time}
                </div>

                {/* Day cells */}
                {event.dates.map((date) => {
                  const slotKey = `${date}_${time}`;
                  const isSelected = selectedSlots.has(slotKey);

                  return (
                    <div
                      key={slotKey}
                      data-slot={slotKey}
                      onMouseDown={() => startDrag(slotKey)}
                      onMouseEnter={() => handleMouseEnter(slotKey)}
                      onTouchStart={() => startDrag(slotKey)}
                      className={`h-10 sm:h-9 border-r last:border-r-0 border-slate-200 transition-colors flex items-center justify-center text-[11px] font-medium ${
                        isSelected
                          ? 'bg-emerald-500 text-white font-semibold'
                          : 'bg-white hover:bg-indigo-50/40 active:bg-indigo-100/60 text-transparent'
                      }`}
                    >
                      {isSelected ? '✓ Libre' : ''}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Save Bar */}
      <div className="hidden sm:flex mt-4 pt-4 border-t border-slate-200 items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-500 inline-block" />
            <span><strong>{selectedSlots.size}</strong> franjas horarias seleccionadas como libres</span>
          </div>
          {hasChanges && (
            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
              Cambios sin guardar
            </span>
          )}
          {savedSuccess && (
            <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-600" /> ¡Disponibilidad guardada!
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleSaveClick}
          disabled={isSaving || !participantName.trim()}
          className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : savedSuccess ? (
            <>
              <CheckCheck className="w-4 h-4" /> Guardado
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Guardar mi disponibilidad
            </>
          )}
        </button>
      </div>

      {/* Mobile Floating Sticky Bottom Action Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg z-40 flex items-center justify-between gap-3 safe-area-bottom">
        <div className="flex flex-col text-left">
          <span className="text-xs font-bold text-slate-900">
            {selectedSlots.size} {selectedSlots.size === 1 ? 'bloque libre' : 'bloques libres'}
          </span>
          <span className="text-[10px] text-slate-500">
            {hasChanges ? 'Cambios pendientes' : savedSuccess ? '✓ Guardado' : 'Listo para enviar'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleSaveClick}
          disabled={isSaving || !participantName.trim()}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : savedSuccess ? (
            <>
              <CheckCheck className="w-3.5 h-3.5" /> Guardado
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" /> Guardar
            </>
          )}
        </button>
      </div>
    </div>
  );
}
