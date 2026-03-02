import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '◉' },
  { to: '/agents', label: 'Agents', icon: '◎' },
  { to: '/events', label: 'Events', icon: '⚡' },
  { to: '/marketplace', label: 'Marketplace', icon: '◈' },
  { to: '/register', label: 'Register', icon: '+' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-[#0d1117] border-r border-[#21262d] flex flex-col">
      <div className="px-4 py-5 border-b border-[#21262d]">
        <h1 className="text-sm font-bold text-[#e6edf3] tracking-wide uppercase">
          Agent Platform
        </h1>
        <p className="text-[10px] text-[#7d8590] mt-0.5">Observability + Ownership</p>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            aria-label={item.label}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#58a6ff] ${
                isActive
                  ? 'bg-[#1f6feb1a] text-[#58a6ff] font-medium'
                  : 'text-[#7d8590] hover:text-[#e6edf3] hover:bg-[#161b22]'
              }`
            }
          >
            <span className="text-xs w-4 text-center" aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-[#21262d] text-[10px] text-[#484f58]">
        Powered by PostHog
      </div>
    </aside>
  )
}
