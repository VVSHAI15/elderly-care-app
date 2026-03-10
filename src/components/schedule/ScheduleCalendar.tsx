"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, User, X } from "lucide-react";
import type { ScheduledShift } from "./types";

interface Props {
  shifts: ScheduledShift[];
  onShiftClick?: (shift: ScheduledShift) => void;
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 border-blue-300 text-blue-800",
  IN_PROGRESS: "bg-green-100 border-green-300 text-green-800",
  COMPLETED: "bg-gray-100 border-gray-300 text-gray-600",
  CANCELLED: "bg-red-50 border-red-200 text-red-500 line-through",
};

function getWeekDays(anchor: Date): Date[] {
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - anchor.getDay()); // Sunday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(start: string, end: string) {
  const diff = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
}

export function ScheduleCalendar({ shifts, onShiftClick }: Props) {
  const [anchor, setAnchor] = useState(() => new Date());
  const weekDays = getWeekDays(anchor);

  const prevWeek = () => {
    const d = new Date(anchor);
    d.setDate(d.getDate() - 7);
    setAnchor(d);
  };

  const nextWeek = () => {
    const d = new Date(anchor);
    d.setDate(d.getDate() + 7);
    setAnchor(d);
  };

  const today = new Date();

  return (
    <div className="bg-white rounded-2xl border border-[#d8e2f1] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8f0fb]">
        <h2 className="text-lg font-semibold text-gray-900">
          {weekDays[0].toLocaleDateString([], { month: "long", year: "numeric" })}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            className="p-2 rounded-lg hover:bg-[#f0f5fd] transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => setAnchor(new Date())}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-[#f0f5fd] text-[#2f5f9f] hover:bg-[#dbe8f8] transition-colors"
          >
            Today
          </button>
          <button
            onClick={nextWeek}
            className="p-2 rounded-lg hover:bg-[#f0f5fd] transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Day columns */}
      <div className="grid grid-cols-7 divide-x divide-[#e8f0fb]">
        {weekDays.map((day) => {
          const isToday = sameDay(day, today);
          const dayShifts = shifts.filter((s) =>
            sameDay(new Date(s.startTime), day)
          );

          return (
            <div key={day.toISOString()} className="min-h-[160px]">
              {/* Day header */}
              <div
                className={`px-3 py-2 text-center border-b border-[#e8f0fb] ${
                  isToday ? "bg-[#dbe8f8]" : "bg-[#f7faff]"
                }`}
              >
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {day.toLocaleDateString([], { weekday: "short" })}
                </div>
                <div
                  className={`text-lg font-bold mt-0.5 ${
                    isToday ? "text-[#2f5f9f]" : "text-gray-800"
                  }`}
                >
                  {day.getDate()}
                </div>
              </div>

              {/* Shifts */}
              <div className="p-1.5 space-y-1">
                {dayShifts.length === 0 && (
                  <div className="h-8" />
                )}
                {dayShifts.map((shift) => (
                  <button
                    key={shift.id}
                    onClick={() => onShiftClick?.(shift)}
                    className={`w-full text-left rounded-lg border px-2 py-1.5 text-xs transition-opacity hover:opacity-80 ${
                      STATUS_COLORS[shift.status]
                    }`}
                  >
                    <div className="font-semibold truncate">
                      {shift.caregiver.name ?? shift.caregiver.email}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 text-[10px] opacity-80">
                      <Clock className="w-2.5 h-2.5" />
                      {formatTime(shift.startTime)} · {formatDuration(shift.startTime, shift.endTime)}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 text-[10px] opacity-70 truncate">
                      <User className="w-2.5 h-2.5" />
                      {shift.patient.user.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Shift detail popup
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
            <span
              className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[shift.status]}`}
            >
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
