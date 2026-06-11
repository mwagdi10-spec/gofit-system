import React, { useState, useEffect, useMemo, useRef } from 'react';
import { formatName } from '../../utils/formatters';

export function SearchableDropdown({ options, value, onChange, placeholder = 'Search exercise...', allowNew = false }) {

  const [q, setQ]       = useState('');

  const [open, setOpen] = useState(false);

  const ref             = useRef(null);

  const filtered = useMemo(() => options.filter(o => o.name.toLowerCase().includes(q.toLowerCase())), [options, q]);

  useEffect(() => {

    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };

    document.addEventListener('mouseup', h);

    return () => document.removeEventListener('mouseup', h);

  }, []);

  const selected = options.find(o => o.name === value);

  return (

    <div ref={ref} className="relative w-full">

      <div onClick={() => setOpen(o => !o)} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-sm cursor-pointer flex justify-between items-center gap-2 select-none">

        <span className="text-slate-400 text-xs">▾</span>

        <span className={selected ? 'text-slate-900' : 'text-slate-400'}>{selected ? formatName(selected.name) : placeholder}</span>

      </div>

      {open && (

        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl overflow-hidden">

          <div className="p-2 border-b border-slate-100">

            <input autoFocus type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Search..." className="w-full p-2 bg-slate-50 rounded-xl text-sm font-bold outline-none" />

          </div>

          <div className="max-h-48 overflow-y-auto">

            {filtered.length === 0 && q.length === 0

              ? <div className="p-3 text-center text-slate-400 text-xs font-black">No results</div>

              : filtered.length === 0 && allowNew

              ? <div key="new" onMouseDown={() => { onChange(q); setQ(''); setOpen(false); }} className="p-3 text-left text-sm font-black hover:bg-blue-50 cursor-pointer border-b border-slate-50">

                  ➕ Add new: <span className="text-blue-600">{formatName(q)}</span>

                </div>

              : filtered.map(o => (

                <div key={o.id} onMouseDown={() => { onChange(o.name); setQ(''); setOpen(false); }} className="p-3 text-left text-sm font-black hover:bg-emerald-50 cursor-pointer border-b border-slate-50 last:border-0">

                  {formatName(o.name)}

                </div>

              ))

            }

            {allowNew && q.length > 0 && filtered.length > 0 && (

              <div key="new" onMouseDown={() => { onChange(q); setQ(''); setOpen(false); }} className="p-3 text-left text-sm font-black hover:bg-blue-50 cursor-pointer border-t border-slate-50 bg-blue-50">

                ➕ Add new: <span className="text-blue-600">{formatName(q)}</span>

              </div>

            )}

          </div>

        </div>

      )}

    </div>

  );

}