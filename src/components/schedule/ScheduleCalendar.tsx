"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Clock, User, X, Loader2 } from "lucide-react";
import type { ScheduledShift } from "./types";

type ViewMode = "day" | "week" | "month" | "year";

interface Props {
  onShiftClick?: (shift: ScheduledShift) => void;
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED:      "bg-blue-100 border-blue-300 text-blue-800",
  IN_PROGRESS:    "bg-green-100 border-green-300 text-green-800",
  COMPLETED:      "bg-gray-100 border-gray-300 text-gray-600",
  CANCELLED:      "bg-red-50 border-red-200 text-red-500 line-through",
  MISSED:         "bg-orange-100 border-orange-300 text-orange-700",
  NEEDS_COVERAGE: "bg-yellow-100 border-yellow-300 text-yellow-800",
};

const STATUS_DOT: Record<string, string> = {
  SCHEDULED:      "bg-blue-400",
  IN_PROGRESS:    "bg-green-400",
  COMPLETED:      "bg-gray-400",
  CANCELLED:      "bg-red-400",
  MISSED:         "bg-orange-400",
  NEEDS_COVERAGE: "bg-yellow-400",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(start: string, end: string) {
  const diff = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
}

function getWeekDays(anchor: Date): Date[] {
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - anchor.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i); return d;
  });
}

function getMonthDays(anchor: Date): Date[] {
  const year = anchor.getFullYear(), month = anchor.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];
  // pad start
  for (let i = 0; i < firstDay.getDay(); i++) {
    const d = new Date(firstDay); d.setDate(firstDay.getDate() - (firstDay.getDay() - i)); days.push(d);
  }
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  // pad end to complete last row
  while (days.length % 7 !== 0) {
    const last = days[days.length - 1];
    const d = new Date(last); d.setDate(last.getDate() + 1); days.push(d);
  }
  return days;
}

function rangeForView(view: ViewMode, anchor: Date): { start: Date; end: Date } {
  const start = new Date(anchor);
  const end = new Date(anchor);
  if (view === "day") {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (view === "week") {
    start.setDate(anchor.getDate() - anchor.getDay());
    start.setHours(0, 0, 0, 0);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (view === "month") {
    start.setDate(1); start.setHours(0, 0, 0, 0);
    end.setMonth(anchor.getMonth() + 1, 0); end.setHours(23, 59, 59, 999);
  } else {
    start.setMonth(0, 1); start.setHours(0, 0, 0, 0);
    end.setMonth(11, 31); end.setHours(23, 59, 59, 999);
  }
  return { start, end };
}

function navigate(view: ViewMode, anchor: Date, dir: -1 | 1): Date {
  const d = new Date(anchor);
  if (view === "day")   d.setDate(d.getDate() + dir);
  if (view === "week")  d.setDate(d.getDate() + dir * 7);
  if (view === "month") d.setMonth(d.getMonth() + dir);
  if (view === "year")  d.setFullYear(d.getFullYear() + dir);
  return d;
}

function headerLabel(view: ViewMode, anchor: Date, weekDays?: Date[]): string {
  if (view === "day")   return anchor.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  if (view === "week")  return `${weekDays![0].toLocaleDateString([], { month: "short", day: "numeric" })} – ${weekDays![6].toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`;
  if (view === "month") return anchor.toLocaleDateString([], { month: "long", year: "numeric" });
  return String(anchor.getFullYear());
}

// ── Main component ────────────────────────────────────────────────────────────

export function ScheduleCalendar({ onShiftClick }: Props) {
  const [view, setView] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [shifts, setShifts] = useState<ScheduledShift[]>([]);
  const [loading, setLoading] = useState(false);
  const today = new Date();

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    const { start, end } = rangeForView(view, anchor);
    try {
      const res = await fetch(
        `/api/schedule?from=${start.toISOString()}&to=${end.toISOString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setShifts(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }, [view, anchor]);

  useEffect(() => { fetchShifts(); }, [fetchShifts]);

  const prev = () => setAnchor((a) => navigate(view, a, -1));
  const next = () => setAnchor((a) => navigate(view, a, 1));
  const weekDays = getWeekDays(anchor);

  return (
    <div className="bg-white rounded-2xl border border-[#d8e2f1] shadow-sm overflow-hidden">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-[#e8f0fb]">
        <div className="flex items-center gap-2">
          <button onClick={prev} className="p-2 rounded-lg hover:bg-[#f0f5fd] transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => setAnchor(new Date())}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-[#f0f5fd] text-[#2f5f9f] hover:bg-[#dbe8f8] transition-colors"
          >
            Today
          </button>
          <button onClick={next} className="p-2 rounded-lg hover:bg-[#f0f5fd] transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
          <span className="ml-2 text-base font-semibold text-gray-900">
            {headerLabel(view, anchor, weekDays)}
          </span>
          {loading && <Loader2 className="w-4 h-4 text-[#2f5f9f] animate-spin ml-1" />}
        </div>

        {/* View toggle */}
        <div className="flex bg-[#f0f5fd] rounded-xl p-1 gap-1">
          {(["day", "week", "month", "year"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                view === v ? "bg-white text-[#2f5f9f] shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* ── Views ── */}
      {view === "day"   && <DayView   anchor={anchor} shifts={shifts} today={today} onShiftClick={onShiftClick} />}
      {view === "week"  && <WeekView  weekDays={weekDays} shifts={shifts} today={today} onShiftClick={onShiftClick} />}
      {view === "month" && <MonthView anchor={anchor} shifts={shifts} today={today} onShiftClick={onShiftClick} />}
      {view === "year"  && <YearView  anchor={anchor} shifts={shifts} today={today} onMonthClick={(d) => { setAnchor(d); setView("month"); }} />}
    </div>
  );
}

// ── Day view ─────────────────────────────────────────────────────────────────

function DayView({ anchor, shifts, today, onShiftClick }: { anchor: Date; shifts: ScheduledShift[]; today: Date; onShiftClick?: (s: ScheduledShift) => void }) {
  const dayShifts = shifts.filter((s) => sameDay(new Date(s.startTime), anchor));
  const isToday = sameDay(anchor, today);

  return (
    <div className="p-6">
      <div className={`rounded-xl border p-4 ${isToday ? "border-[#2f5f9f] bg-[#f0f5fd]" : "border-[#e8f0fb]"}`}>
        {dayShifts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No shifts scheduled for this day.</p>
        ) : (
          <div className="space-y-3">
            {dayShifts.map((s) => (
              <button
                key={s.id}
                onClick={() => onShiftClick?.(s)}
                className={`w-full text-left rounded-xl border px-4 py-3 transition-opacity hover:opacity-80 ${STATUS_COLORS[s.status]}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{s.caregiver.name ?? s.caregiver.email}</span>
                  <span className="text-xs opacity-70">{formatTime(s.startTime)} – {formatTime(s.endTime)} ({formatDuration(s.startTime, s.endTime)})</span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs opacity-70">
                  <User className="w-3 h-3" /> {s.patient.user.name}
                </div>
                {s.notes && <div className="mt-1 text-xs opacity-60 truncate">{s.notes}</div>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Week view ─────────────────────────────────────────────────────────────────

function WeekView({ weekDays, shifts, today, onShiftClick }: { weekDays: Date[]; shifts: ScheduledShift[]; today: Date; onShiftClick?: (s: ScheduledShift) => void }) {
  return (
    <div className="grid grid-cols-7 divide-x divide-[#e8f0fb]">
      {weekDays.map((day) => {
        const isToday = sameDay(day, today);
        const dayShifts = shifts.filter((s) => sameDay(new Date(s.startTime), day));
        return (
          <div key={day.toISOString()} className="min-h-[160px]">
            <div className={`px-3 py-2 text-center border-b border-[#e8f0fb] ${isToday ? "bg-[#dbe8f8]" : "bg-[#f7faff]"}`}>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {day.toLocaleDateString([], { weekday: "short" })}
              </div>
              <div className={`text-lg font-bold mt-0.5 ${isToday ? "text-[#2f5f9f]" : "text-gray-800"}`}>
                {day.getDate()}
              </div>
            </div>
            <div className="p-1.5 space-y-1">
              {dayShifts.length === 0 && <div className="h-8" />}
              {dayShifts.map((shift) => (
                <button
                  key={shift.id}
                  onClick={() => onShiftClick?.(shift)}
                  className={`w-full text-left rounded-lg border px-2 py-1.5 text-xs transition-opacity hover:opacity-80 ${STATUS_COLORS[shift.status]}`}
                >
                  <div className="font-semibold truncate">{shift.caregiver.name ?? shift.caregiver.email}</div>
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] opacity-80">
                    <Clock className="w-2.5 h-2.5" />
                    {formatTime(shift.startTime)} · {formatDuration(shift.startTime, shift.endTime)}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] opacity-70 truncate">
                    <User className="w-2.5 h-2.5" /> {shift.patient.user.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Month view ────────────────────────────────────────────────────────────────

function MonthView({ anchor, shifts, today, onShiftClick }: { anchor: Date; shifts: ScheduledShift[]; today: Date; onShiftClick?: (s: ScheduledShift) => void }) {
  const days = getMonthDays(anchor);
  const currentMonth = anchor.getMonth();

  return (
    <div>
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-[#e8f0fb]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide bg-[#f7faff]">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 divide-x divide-y divide-[#e8f0fb]">
        {days.map((day) => {
          const isToday = sameDay(day, today);
          const isCurrentMonth = day.getMonth() === currentMonth;
          const dayShifts = shifts.filter((s) => sameDay(new Date(s.startTime), day));
          const visible = dayShifts.slice(0, 3);
          const overflow = dayShifts.length - visible.length;

          return (
            <div key={day.toISOString()} className={`min-h-[100px] p-1.5 ${!isCurrentMonth ? "bg-gray-50/60" : ""}`}>
              <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold mb-1 ${
                isToday ? "bg-[#2f5f9f] text-white" : isCurrentMonth ? "text-gray-800" : "text-gray-300"
              }`}>
                {day.getDate()}
              </div>
              <div className="space-y-0.5">
                {visible.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onShiftClick?.(s)}
                    className={`w-full text-left rounded px-1.5 py-0.5 text-[10px] font-medium truncate border transition-opacity hover:opacity-80 ${STATUS_COLORS[s.status]}`}
                  >
                    {formatTime(s.startTime)} {s.caregiver.name?.split(" ")[0] ?? "—"}
                  </button>
                ))}
                {overflow > 0 && (
                  <div className="text-[10px] text-[#2f5f9f] font-medium pl-1">+{overflow} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Year view ─────────────────────────────────────────────────────────────────

function YearView({ anchor, shifts, today, onMonthClick }: { anchor: Date; shifts: ScheduledShift[]; today: Date; onMonthClick: (d: Date) => void }) {
  const year = anchor.getFullYear();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-6">
      {Array.from({ length: 12 }, (_, month) => {
        const monthDate = new Date(year, month, 1);
        const days = getMonthDays(monthDate);
        const monthShifts = shifts.filter((s) => {
          const d = new Date(s.startTime);
          return d.getFullYear() === year && d.getMonth() === month;
        });

        return (
          <button
            key={month}
            onClick={() => onMonthClick(new Date(year, month, 1))}
            className="bg-white border border-[#e8f0fb] rounded-xl p-3 hover:border-[#2f5f9f] hover:shadow-sm transition-all text-left"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">
                {monthDate.toLocaleDateString([], { month: "short" })}
              </span>
              {monthShifts.length > 0 && (
                <span className="text-[10px] font-semibold text-[#2f5f9f] bg-[#e8f0fb] px-1.5 py-0.5 rounded-full">
                  {monthShifts.length}
                </span>
              )}
            </div>
            {/* Mini calendar */}
            <div className="grid grid-cols-7 gap-px">
              {["S","M","T","W","T","F","S"].map((d, i) => (
                <div key={i} className="text-[8px] text-gray-300 text-center font-medium">{d}</div>
              ))}
              {days.map((day) => {
                const isCurrentMonth = day.getMonth() === month;
                const isToday = sameDay(day, today);
                const hasShifts = monthShifts.some((s) => sameDay(new Date(s.startTime), day));
                return (
                  <div
                    key={day.toISOString()}
                    className={`w-4 h-4 flex items-center justify-center rounded-full text-[8px] mx-auto ${
                      isToday ? "bg-[#2f5f9f] text-white font-bold"
                      : hasShifts && isCurrentMonth ? "bg-blue-100 text-blue-700 font-semibold"
                      : isCurrentMonth ? "text-gray-400"
                      : "text-gray-200"
                    }`}
                  >
                    {isCurrentMonth ? day.getDate() : ""}
                  </div>
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Shift detail popup ────────────────────────────────────────────────────────

interface ShiftDetailProps {
  shift: ScheduledShift;
  onClose: () => void;
  onCancel?: (id: string) => void;
  isAdmin?: boolean;
}

export function ShiftDetailPanel({ shift, onClose, onCancel, isAdmin }: ShiftDetailProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#d8e2f1] w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8f0fb]">
          <h3 className="font-semibold text-gray-900">Shift Details</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3 text-sm text-gray-700">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase">Caregiver</span>
            <p className="font-medium">{shift.caregiver.name ?? shift.caregiver.email}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase">Patient</span>
            <p className="font-medium">{shift.patient.user.name}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase">Time</span>
            <p className="font-medium">
              {new Date(shift.startTime).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
            </p>
            <p>
              {formatTime(shift.startTime)} – {formatTime(shift.endTime)}{" "}
              <span className="text-gray-400">({formatDuration(shift.startTime, shift.endTime)})</span>
            </p>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase">Status</span>
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[shift.status]}`}>
              {shift.status}
            </span>
          </div>
          {shift.notes && (
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase">Notes</span>
              <p>{shift.notes}</p>
            </div>
          )}
        </div>
        {isAdmin && shift.status === "SCHEDULED" && onCancel && (
          <div className="px-6 pb-4">
            <button
              onClick={() => onCancel(shift.id)}
              className="w-full py-2 rounded-xl text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-200"
            >
              Cancel Shift
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
