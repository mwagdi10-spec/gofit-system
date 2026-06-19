// WeeklySidebar.jsx
// Drop into src/features/WeeklySidebar.jsx

import React, { useState, useCallback } from 'react';

// ── Sub-component: Single Day Row ─────────────────────────────────────────────
function DayRow({ day, isSelected, onSelect, onRemove, onRename }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(day.title);

  const commitRename = useCallback(() => {
    if (label.trim()) onRename(label.trim());
    setEditing(false);
  }, [label, onRename]);

  return (
    <div
      className={`group flex items-center justify-between mx-1 px-3 py-2 rounded-lg cursor-pointer transition-colors
        ${isSelected ? 'bg-emerald-500 text-white' : 'text-slate-300 hover:bg-slate-600'}`}
      onClick={() => !editing && onSelect(day.id)}
    >
      {editing ? (
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => e.key === 'Enter' && commitRename()}
          onClick={(e) => e.stopPropagation()}
          className="bg-transparent border-b border-emerald-300 text-sm outline-none w-full"
        />
      ) : (
        <span
          className="text-sm font-medium flex-1 truncate"
          onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
        >
          {day.title}
        </span>
      )}

      {/* Action buttons — visible on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
        <button
          title="Rename"
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          className="text-xs text-slate-300 hover:text-white px-1"
        >
          ✏️
        </button>
        <button
          title="Delete"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="text-xs text-slate-300 hover:text-red-400 px-1"
        >
          🗑
        </button>
      </div>
    </div>
  );
}

// ── Sub-component: Week Accordion ─────────────────────────────────────────────
function WeekAccordion({
  week,
  selectedDayId,
  onSelectDay,
  onAddDay,
  onRemoveDay,
  onRenameDay,
  onRemoveWeek,
  onRenameWeek,
}) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(week.title);

  const commitRename = () => {
    if (label.trim()) onRenameWeek(label.trim());
    setEditing(false);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700">
      {/* Week Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-slate-700 cursor-pointer select-none"
        onClick={() => !editing && setOpen((v) => !v)}
      >
        {editing ? (
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => e.key === 'Enter' && commitRename()}
            onClick={(e) => e.stopPropagation()}
            className="bg-transparent border-b border-emerald-300 text-white text-sm outline-none flex-1"
          />
        ) : (
          <span
            className="text-white font-semibold text-sm flex-1"
            onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
          >
            {week.title}
            <span className="ml-2 text-slate-400 font-normal text-xs">
              ({week.days.length})
            </span>
          </span>
        )}

        <div className="flex items-center gap-2 ml-2">
          {/* Add Day */}
          <button
            title="Add Day"
            onClick={(e) => { e.stopPropagation(); onAddDay(week.id); setOpen(true); }}
            className="text-emerald-400 hover:text-emerald-300 text-lg leading-none font-bold"
          >
            +
          </button>
          {/* Delete Week */}
          <button
            title="Delete Week"
            onClick={(e) => { e.stopPropagation(); onRemoveWeek(week.id); }}
            className="text-slate-500 hover:text-red-400 text-sm"
          >
            ✕
          </button>
          {/* Chevron */}
          <span className="text-slate-400 text-xs pointer-events-none">
            {open ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* Days List */}
      {open && (
        <div className="flex flex-col gap-1 py-1 bg-slate-800">
          {week.days.length === 0 ? (
            <p className="text-slate-500 text-xs px-4 py-2 italic">No days — click + to add</p>
          ) : (
            week.days.map((day) => (
              <DayRow
                key={day.id}
                day={day}
                isSelected={selectedDayId === day.id}
                onSelect={onSelectDay}
                onRemove={() => onRemoveDay(week.id, day.id)}
                onRename={(title) => onRenameDay(week.id, day.id, title)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Export: WeeklySidebar ────────────────────────────────────────────────
export default function WeeklySidebar({
  plan,
  selectedDayId,
  onSelectDay,
  onAddWeek,
  onAddDay,
  onRemoveDay,
  onRenameDay,
  onRemoveWeek,
  onRenameWeek,
}) {
  return (
    <aside className="flex flex-col h-full w-64 bg-slate-800 border-r border-slate-700 overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="text-white font-bold text-base">Workout Plan</h2>
        <p className="text-slate-400 text-xs mt-0.5">
          {plan.weeks.length} week{plan.weeks.length !== 1 ? 's' : ''} ·{' '}
          {plan.weeks.reduce((acc, w) => acc + w.days.length, 0)} days
        </p>
      </div>

      {/* Weeks */}
      <div className="flex flex-col gap-2 p-3 flex-1 overflow-y-auto">
        {plan.weeks.map((week) => (
          <WeekAccordion
            key={week.id}
            week={week}
            selectedDayId={selectedDayId}
            onSelectDay={onSelectDay}
            onAddDay={onAddDay}
            onRemoveDay={onRemoveDay}
            onRenameDay={onRenameDay}
            onRemoveWeek={onRemoveWeek}
            onRenameWeek={onRenameWeek}
          />
        ))}

        {plan.weeks.length === 0 && (
          <p className="text-slate-500 text-sm text-center mt-8 italic">
            No weeks yet — add one below
          </p>
        )}
      </div>

      {/* Add Week */}
      <div className="p-3 border-t border-slate-700">
        <button
          onClick={onAddWeek}
          className="w-full py-2 rounded-xl border border-dashed border-slate-500 text-slate-400 text-sm
            hover:border-emerald-400 hover:text-emerald-400 transition-colors font-medium"
        >
          + Add Week
        </button>
      </div>
    </aside>
  );
}