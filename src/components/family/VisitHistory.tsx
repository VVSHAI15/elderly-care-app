"use client";

interface Visit {
  date: string;
  caregiverName: string | null;
  durationMinutes: number | null;
  notes: string | null;
}

interface Props {
  visits: Visit[];
}

export function VisitHistory({ visits }: Props) {
  return (
    <div className="space-y-3">
      {visits.slice(0, 10).map((v, i) => {
        const duration = v.durationMinutes !== null
          ? v.durationMinutes >= 60
            ? `${Math.floor(v.durationMinutes / 60)}h ${v.durationMinutes % 60}m`
            : `${v.durationMinutes}m`
          : "In progress";

        return (
          <div key={i} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
            <div className="w-9 h-9 bg-[#dbe8f8] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[#2f5f9f] font-semibold text-xs">
                {v.caregiverName?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "CG"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">{v.caregiverName || "Caregiver"}</p>
                <span className="text-xs font-semibold text-[#2f5f9f]">{duration}</span>
              </div>
              <p className="text-xs text-gray-500">
                {new Date(v.date).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                {" · "}
                {new Date(v.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
              {v.notes && <p className="text-xs text-gray-400 mt-1 truncate">{v.notes}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
