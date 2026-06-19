const TABS = [
  { name: 'Home',    label: 'Home',    icon: '⌂' },
  { name: 'Plan',    label: 'Plan',    icon: '▦' },
  { name: 'Profile', label: 'Profile', icon: '◉' },
];

export default function BottomNav({ navigate, current }) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm
                    flex justify-around items-center h-16 z-50
                    bg-[#14142B] border-t border-[#2A2A50]">
      {TABS.map(t => (
        <button
          key={t.name}
          onClick={() => navigate(t.name)}
          className={`flex flex-col items-center gap-0.5 text-xs font-semibold transition-colors
            ${current === t.name ? 'text-blue-400' : 'text-slate-400'}`}
        >
          <span className="text-2xl leading-tight">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
