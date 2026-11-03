'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Event, SlotAvailability } from '@/types';
import {
  Check,
  CheckCheck,
  Sparkles,
  Info,
  Hand,
  Paintbrush,
  Eye,
  EyeOff
} from 'lucide-react';

interface AvailabilityGridProps {
  event: Event;
  timeSlots: string[];
  initialSlots?: string[];
  participantName: string;
  onSave: (slots: string[]) => Promise<void>;
  isSaving: boolean;
  heatmap?: Record<string, SlotAvailability>;
  totalParticipants?: number;
}

export default function AvailabilityGrid({
  event,
  timeSlots,
  initialSlots = [],
  participantName,
  onSave,
  isSaving,
  heatmap,
  totalParticipants = 0,
}: AvailabilityGridProps) {
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(() => new Set(initialSlots));
  const [hasChanges, setHasChanges] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showGroupHints, setShowGroupHints] = useState(true);

  // Mobile mode: 'scroll' allows native swipe/scroll and tap to select; 'paint' allows continuous drag painting
  const [mobileMode, setMobileMode] = useState<'scroll' | 'paint'>('scroll');

  // Track touch positions to distinguish tap from swipe/scroll in 'scroll' mode
  const touchStartRef = useRef<{ x: number; y: number; time: number; slotKey: string } | null>(null);
  const isTouchRef = useRef(false);

  // Sync initialSlots when switching participant or reloading
  useEffect(() => {
    setSelectedSlots(new Set(initialSlots));
    setHasChanges(false);
  }, [initialSlots]);

  // Drag interaction state for desktop mouse and mobile paint mode
  const isDraggingRef = useRef(false);
  const dragModeRef = useRef<'add' | 'remove' | null>(null);

  const toggleSingleSlot = useCallback((slotKey: string) => {
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slotKey)) {
        next.delete(slotKey);
      } else {
        next.add(slotKey);
      }
      return next;
    });
    setHasChanges(true);
    setSavedSuccess(false);
  }, []);

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

  // Desktop Mouse Handlers
  const handleMouseDown = (slotKey: string) => {
    if (isTouchRef.current) return;
    startDrag(slotKey);
  };

  // Mobile Touch Handlers
  const handleCellTouchStart = (slotKey: string, e: React.TouchEvent) => {
    isTouchRef.current = true;

    if (mobileMode === 'paint') {
      startDrag(slotKey);
    } else {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
        slotKey,
      };
    }
  };

  const handleCellTouchEnd = (e: React.TouchEvent) => {
    if (mobileMode === 'paint') {
      stopDrag();
    } else if (touchStartRef.current) {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const dist = Math.hypot(dx, dy);
      const duration = Date.now() - touchStartRef.current.time;

      // Only toggle if the finger stayed within 10px and touch was brief (genuine tap, NOT a scroll!)
      if (dist < 10 && duration < 500) {
        toggleSingleSlot(touchStartRef.current.slotKey);
      }
      touchStartRef.current = null;
    }

    setTimeout(() => {
      isTouchRef.current = false;
    }, 400);
  };

  // Mobile Continuous Paint Drag
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-slate-50 dark:bg-slate-900/90 p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
          <span className="hidden sm:inline">
            Haz <strong>clic y arrastra</strong> sobre los bloques para marcar o desmarcar tus horas disponibles.
          </span>
          <span className="sm:hidden text-[11px]">
            {mobileMode === 'scroll'
              ? 'Modo Tocar activo: desliza libremente y toca una celda para marcarla.'
              : 'Modo Pintar activo: arrastra el dedo para pintar bloques.'}
          </span>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          {/* Mobile Mode Switcher */}
          <div className="flex sm:hidden items-center bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setMobileMode('scroll')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
                mobileMode === 'scroll'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Hand className="w-3.5 h-3.5" /> Tocar
            </button>
            <button
              type="button"
              onClick={() => setMobileMode('paint')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
                mobileMode === 'paint'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Paintbrush className="w-3.5 h-3.5" /> Pintar
            </button>
          </div>

          {/* Group hints toggle if participants exist */}
          {totalParticipants > 0 && heatmap && (
            <button
              type="button"
              onClick={() => setShowGroupHints(!showGroupHints)}
              title="Mostrar u ocultar cuántos compañeros ya están libres en cada bloque"
              className={`hidden md:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition shadow-2xs ${
                showGroupHints
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {showGroupHints ? <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{showGroupHints ? 'Ver grupo de fondo' : 'Ocultar grupo'}</span>
            </button>
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs"
            >
              Marcar todo
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Grid Container with Solid Sticky Column & Clean Stacking */}
      <div
        className={`overflow-x-auto pb-4 cursor-pointer rounded-2xl border border-slate-300 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 isolate ${
          mobileMode === 'paint' ? 'touch-none' : 'touch-pan-x touch-pan-y'
        }`}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleCellTouchEnd}
      >
        <div className="inline-block min-w-full align-middle">
          {/* Day Header Row */}
          <div
            className="grid bg-slate-100 dark:bg-slate-800/95 border-b border-slate-300 dark:border-slate-700 text-center text-xs font-semibold text-slate-700 dark:text-slate-200 sticky top-0 z-30"
            style={{ gridTemplateColumns: `70px repeat(${event.dates.length}, minmax(100px, 1fr))` }}
          >
            {/* Sticky Top-Left Corner (Solid Opaque, Highest Z-Index) */}
            <div className="p-2.5 border-r border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 sticky left-0 z-40 flex items-center justify-center text-slate-700 dark:text-slate-300 font-mono text-[11px] shadow-[2px_0_4px_-1px_rgba(0,0,0,0.15)]">
              Hora
            </div>
            {event.dates.map((date) => (
              <div
                key={date}
                onClick={() => handleToggleColumn(date)}
                title="Toca para alternar todo este día"
                className="p-2.5 border-r last:border-r-0 border-slate-300 dark:border-slate-700 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 active:bg-indigo-100 dark:active:bg-indigo-900/60 transition cursor-pointer flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800/95"
              >
                <span className="truncate max-w-[120px] font-bold">{date}</span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-normal hover:underline">Alternar</span>
              </div>
            ))}
          </div>

          {/* Time Slot Rows */}
          <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
            {timeSlots.map((time) => (
              <div
                key={time}
                className="grid text-center"
                style={{ gridTemplateColumns: `70px repeat(${event.dates.length}, minmax(100px, 1fr))` }}
              >
                {/* Sticky Left Column: Solid Opaque z-20 so day cells slide UNDERNEATH */}
                <div className="p-2 font-mono text-[11px] text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 sticky left-0 z-20 border-r border-slate-300 dark:border-slate-700 flex items-center justify-center shadow-[2px_0_4px_-1px_rgba(0,0,0,0.15)]">
                  {time}
                </div>

                {/* Day cells (relative z-0 so they ALWAYS pass under the sticky column) */}
                {event.dates.map((date) => {
                  const slotKey = `${date}_${time}`;
                  const isSelected = selectedSlots.has(slotKey);
                  const groupSlot = heatmap ? heatmap[slotKey] : undefined;
                  const groupCount = groupSlot?.availableCount || 0;

                  return (
                    <div
                      key={slotKey}
                      data-slot={slotKey}
                      onMouseDown={() => handleMouseDown(slotKey)}
                      onMouseEnter={() => handleMouseEnter(slotKey)}
                      onTouchStart={(e) => handleCellTouchStart(slotKey, e)}
                      onTouchEnd={handleCellTouchEnd}
                      className={`h-10 sm:h-9 border-r last:border-r-0 border-slate-200 dark:border-slate-800 transition-colors flex items-center justify-center text-[11px] font-medium relative z-0 ${
                        isSelected
                          ? 'bg-emerald-500 text-white font-semibold'
                          : showGroupHints && groupCount > 0
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/60'
                          : 'bg-white dark:bg-slate-900 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/40 active:bg-indigo-100/60 dark:active:bg-indigo-900/60 text-transparent'
                      }`}
                    >
                      {isSelected ? (
                        '✓ Libre'
                      ) : showGroupHints && groupCount > 0 ? (
                        <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/90 font-mono">
                          {groupCount} libre{groupCount > 1 ? 's' : ''}
                        </span>
                      ) : (
                        ''
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Save Bar */}
      <div className="hidden sm:flex mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-500 inline-block" />
            <span><strong>{selectedSlots.size}</strong> franjas horarias seleccionadas como libres</span>
          </div>
          {hasChanges && (
            <span className="text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full font-medium">
              Cambios sin guardar
            </span>
          )}
          {savedSuccess && (
            <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> ¡Disponibilidad guardada!
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
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-lg z-40 flex items-center justify-between gap-3 safe-area-bottom">
        <div className="flex flex-col text-left">
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            {selectedSlots.size} {selectedSlots.size === 1 ? 'bloque libre' : 'bloques libres'}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
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
