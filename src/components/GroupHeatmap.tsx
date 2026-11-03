'use client';

import React, { useState, useMemo } from 'react';
import { Event, Participant, SlotAvailability } from '@/types';
import {
  Users,
  Check,
  X,
  Trophy,
  Info,
  Calendar,
  Clock,
  UserCheck,
  UserX,
  XCircle
} from 'lucide-react';

interface GroupHeatmapProps {
  event: Event;
  timeSlots: string[];
  participants: Participant[];
  heatmap: Record<string, SlotAvailability>;
  highlightedParticipant?: Participant | null;
  onSelectParticipant?: (p: Participant | null) => void;
}

export default function GroupHeatmap({
  event,
  timeSlots,
  participants,
  heatmap,
  highlightedParticipant,
  onSelectParticipant,
}: GroupHeatmapProps) {
  const [activeSlotKey, setActiveSlotKey] = useState<string | null>(null);

  const totalParticipants = participants.length;

  // Active slot details for tooltip/inspector
  const activeSlot = activeSlotKey ? heatmap[activeSlotKey] : null;

  // Compute top recommended slots (highest availableCount)
  const topSlots = useMemo(() => {
    if (totalParticipants === 0) return [];

    const slotList = Object.values(heatmap).filter((s) => s.availableCount > 0);
    // Sort descending by availableCount, then chronologically
    slotList.sort((a, b) => {
      if (b.availableCount !== a.availableCount) {
        return b.availableCount - a.availableCount;
      }
      return a.slotKey.localeCompare(b.slotKey);
    });

    // Take top distinct slots (up to 4)
    return slotList.slice(0, 4);
  }, [heatmap, totalParticipants]);

  // Determine cell color styles based on ratio (k / N)
  const getCellStyle = (slot: SlotAvailability | undefined) => {
    if (!slot || totalParticipants === 0 || slot.availableCount === 0) {
      return {
        bg: 'bg-slate-50',
        text: 'text-slate-300',
        border: 'border-slate-200',
        label: '-',
      };
    }

    const ratio = slot.ratio;
    const isFull = slot.availableCount === totalParticipants;

    // Highlight specific participant if filtering
    if (highlightedParticipant) {
      const isSelectedByParticipant = highlightedParticipant.slots.includes(slot.slotKey);
      if (isSelectedByParticipant) {
        return {
          bg: 'bg-indigo-600 text-white font-bold ring-2 ring-indigo-400',
          text: 'text-white',
          border: 'border-indigo-700',
          label: `${slot.availableCount}/${totalParticipants}`,
        };
      } else {
        return {
          bg: 'bg-slate-100 text-slate-400 opacity-40',
          text: 'text-slate-400',
          border: 'border-slate-200',
          label: `${slot.availableCount}/${totalParticipants}`,
        };
      }
    }

    // 100% available (Everyone can make it!)
    if (isFull) {
      return {
        bg: 'bg-emerald-600 text-white font-extrabold ring-1 ring-inset ring-emerald-300 shadow-2xs',
        text: 'text-white',
        border: 'border-emerald-600',
        label: `${slot.availableCount}/${totalParticipants} ⭐`,
      };
    }

    // High availability (e.g. 4/5 = 80%)
    if (ratio >= 0.75) {
      return {
        bg: 'bg-emerald-500 text-white font-bold',
        text: 'text-white',
        border: 'border-emerald-500',
        label: `${slot.availableCount}/${totalParticipants}`,
      };
    }

    // Medium availability (e.g. 3/5 = 60%)
    if (ratio >= 0.5) {
      return {
        bg: 'bg-emerald-300 text-emerald-950 font-semibold',
        text: 'text-emerald-950',
        border: 'border-emerald-300',
        label: `${slot.availableCount}/${totalParticipants}`,
      };
    }

    // Moderate availability (e.g. 2/5 = 40%)
    if (ratio >= 0.25) {
      return {
        bg: 'bg-emerald-200 text-emerald-900 font-medium',
        text: 'text-emerald-900',
        border: 'border-emerald-200',
        label: `${slot.availableCount}/${totalParticipants}`,
      };
    }

    // Low availability (1 person)
    return {
      bg: 'bg-emerald-100 text-emerald-800 font-medium',
      text: 'text-emerald-800',
      border: 'border-emerald-100',
      label: `${slot.availableCount}/${totalParticipants}`,
    };
  };

  return (
    <div className="space-y-6 pb-20 sm:pb-0">
      {/* Top Best Times Recommendation Card */}
      {topSlots.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 rounded-2xl p-4 sm:p-5 border border-emerald-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs sm:text-sm mb-2">
            <Trophy className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            Mejores momentos para reunirse (Mayor disponibilidad):
          </div>

          <div className="flex flex-wrap gap-2">
            {topSlots.map((slot) => {
              const isFull = slot.availableCount === totalParticipants;
              return (
                <button
                  type="button"
                  key={slot.slotKey}
                  onClick={() => setActiveSlotKey(slot.slotKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition ${
                    activeSlotKey === slot.slotKey
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : isFull
                      ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                      : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/50'
                  }`}
                >
                  <span className="font-bold">{slot.dateOrDay}</span>
                  <span className="opacity-90">{slot.time}</span>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-black/15 font-mono">
                    {slot.availableCount}/{totalParticipants} {isFull ? '⭐ (Todos)' : 'libres'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Participant Filter Pills */}
      {participants.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Filtrar:
          </span>
          <button
            type="button"
            onClick={() => onSelectParticipant && onSelectParticipant(null)}
            className={`px-2.5 py-1 rounded-lg transition font-medium ${
              !highlightedParticipant
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({participants.length})
          </button>
          {participants.map((p) => {
            const isSelected = highlightedParticipant?.id === p.id;
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => onSelectParticipant && onSelectParticipant(isSelected ? null : p)}
                className={`px-2.5 py-1 rounded-lg transition font-medium border ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                }`}
              >
                {p.name} ({p.slots.length})
              </button>
            );
          })}
        </div>
      )}

      {/* Legend & Instructions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 bg-slate-50 p-3 sm:p-3.5 rounded-2xl border border-slate-200/80">
        <div className="flex items-center gap-1.5">
          <Info className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <span>Toca cualquier bloque para ver quiénes están libres.</span>
        </div>

        {/* Color Gradient Scale Legend */}
        <div className="flex items-center gap-1.5 justify-end">
          <span className="text-[10px] text-slate-500">Menos</span>
          <span className="w-4 sm:w-5 h-4 rounded bg-slate-100 border border-slate-200" title="0 libres" />
          <span className="w-4 sm:w-5 h-4 rounded bg-emerald-100 border border-emerald-200" title="Pocos libres" />
          <span className="w-4 sm:w-5 h-4 rounded bg-emerald-300 border border-emerald-300" title="Mitad libres" />
          <span className="w-4 sm:w-5 h-4 rounded bg-emerald-500 text-white text-[9px] flex items-center justify-center font-bold" title="Casi todos">4/5</span>
          <span className="w-4 sm:w-5 h-4 rounded bg-emerald-600 text-white text-[9px] flex items-center justify-center font-bold ring-1 ring-emerald-300" title="Todos">⭐</span>
          <span className="text-[10px] text-slate-500 font-medium">Todos</span>
        </div>
      </div>

      {/* Heatmap Grid with Sticky Column & Row */}
      <div className="overflow-x-auto pb-4 rounded-2xl border border-slate-300 shadow-xs bg-white isolate">
        <div className="inline-block min-w-full align-middle">
          {/* Header Row */}
          <div
            className="grid bg-slate-100 border-b border-slate-300 text-center text-xs font-semibold text-slate-700 sticky top-0 z-30"
            style={{ gridTemplateColumns: `70px repeat(${event.dates.length}, minmax(100px, 1fr))` }}
          >
            {/* Sticky Top-Left Corner (Solid Opaque, Highest Z-Index) */}
            <div className="p-2.5 border-r border-slate-300 bg-slate-200 sticky left-0 z-40 flex items-center justify-center text-slate-700 font-mono text-[11px] shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)]">
              Hora
            </div>
            {event.dates.map((date) => (
              <div key={date} className="p-2.5 border-r last:border-r-0 border-slate-300 truncate font-bold bg-slate-100">
                {date}
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
                {/* Sticky Left Column: Solid Opaque z-20 so day cells slide UNDERNEATH */}
                <div className="p-2 font-mono text-[11px] text-slate-700 bg-slate-100 sticky left-0 z-20 border-r border-slate-300 flex items-center justify-center shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)]">
                  {time}
                </div>

                {/* Day cells (relative z-0 so they ALWAYS pass under the sticky column) */}
                {event.dates.map((date) => {
                  const slotKey = `${date}_${time}`;
                  const slot = heatmap[slotKey];
                  const style = getCellStyle(slot);
                  const isActive = activeSlotKey === slotKey;

                  return (
                    <div
                      key={slotKey}
                      onMouseEnter={() => setActiveSlotKey(slotKey)}
                      onClick={() => setActiveSlotKey(slotKey)}
                      className={`h-10 sm:h-9 border-r last:border-r-0 border-slate-200 transition cursor-pointer flex items-center justify-center text-[10px] sm:text-[11px] select-none relative ${
                        style.bg
                      } ${style.text} ${
                        isActive ? 'ring-2 ring-indigo-600 z-10 scale-[1.03] shadow-md' : 'z-0'
                      }`}
                    >
                      {totalParticipants > 0 && slot && slot.availableCount > 0 ? (
                        <span>{style.label}</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Detailed Slot Inspector Panel */}
      {activeSlot && (
        <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-left animate-fade-in">
          <div className="flex sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" /> {activeSlot.dateOrDay}
                <span>•</span>
                <Clock className="w-3.5 h-3.5 text-indigo-600" /> {activeSlot.time}
              </div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>{activeSlot.availableCount} de {totalParticipants} personas disponibles</span>
                {totalParticipants > 0 && activeSlot.availableCount === totalParticipants && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                    ¡Todos libres! 🎉
                  </span>
                )}
                {totalParticipants > 0 && activeSlot.availableCount === totalParticipants - 1 && totalParticipants > 1 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200">
                    Casi todos (falta 1)
                  </span>
                )}
              </h3>
            </div>

            <div className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-mono">
              {Math.round(activeSlot.ratio * 100)}% de coincidencia
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Disponibles */}
            <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-100">
              <div className="text-xs font-bold text-emerald-900 mb-2 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                Disponibles ({activeSlot.availableNames.length}):
              </div>
              {activeSlot.availableNames.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Nadie disponible en este horario.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {activeSlot.availableNames.map((name) => (
                    <span
                      key={name}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-medium shadow-2xs flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> {name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* No disponibles */}
            <div className="bg-rose-50/60 rounded-xl p-3 border border-rose-100">
              <div className="text-xs font-bold text-rose-900 mb-2 flex items-center gap-1.5">
                <UserX className="w-4 h-4 text-rose-600" />
                No disponibles ({activeSlot.unavailableNames.length}):
              </div>
              {activeSlot.unavailableNames.length === 0 ? (
                <p className="text-xs text-emerald-700 font-medium">¡Ninguno! Todos pueden a esta hora.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {activeSlot.unavailableNames.map((name) => (
                    <span
                      key={name}
                      className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-1"
                    >
                      <X className="w-3 h-3 text-rose-500" /> {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer / Bottom Modal when active slot is selected */}
      {activeSlot && (
        <div className="sm:hidden fixed inset-x-0 bottom-0 z-50 p-4 bg-white/98 backdrop-blur-md border-t border-slate-300 rounded-t-3xl shadow-2xl text-left animate-slide-up safe-area-bottom">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <span>{activeSlot.dateOrDay}</span>
                <span>•</span>
                <span>{activeSlot.time}</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                <span>{activeSlot.availableCount}/{totalParticipants} personas libres</span>
                <span className="text-xs font-normal text-slate-500">
                  ({Math.round(activeSlot.ratio * 100)}%)
                </span>
              </h4>
            </div>

            <button
              type="button"
              onClick={() => setActiveSlotKey(null)}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2.5 max-h-48 overflow-y-auto">
            {/* Libres */}
            <div>
              <span className="text-[11px] font-bold text-emerald-800 block mb-1">
                ✓ Libres ({activeSlot.availableNames.length}):
              </span>
              {activeSlot.availableNames.length === 0 ? (
                <span className="text-xs text-slate-400 italic">Nadie libre</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {activeSlot.availableNames.map((name) => (
                    <span
                      key={name}
                      className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[11px] font-medium"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Ocupados */}
            {activeSlot.unavailableNames.length > 0 && (
              <div>
                <span className="text-[11px] font-bold text-rose-800 block mb-1">
                  ✕ Ocupados ({activeSlot.unavailableNames.length}):
                </span>
                <div className="flex flex-wrap gap-1">
                  {activeSlot.unavailableNames.map((name) => (
                    <span
                      key={name}
                      className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-medium"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
