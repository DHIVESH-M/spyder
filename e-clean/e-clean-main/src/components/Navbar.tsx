import { useState } from 'react';
import { Menu, X, ScanLine, Recycle } from 'lucide-react';
import { useRouter } from '@/lib/router';

const links = [
  { label: 'Home', to: '/' },
  { label: 'Scan', to: '/scan' },
  { label: 'Recovery', to: '/recovery' },
  { label: 'History', to: '/history' },
  { label: 'About', to: '/about' },
];

export default function Navbar() {
  const { route, navigate } = useRouter();
  const [open, setOpen] = useState(false);

  const go = (to: string) => {
    navigate(to);
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-paper-line bg-paper/85 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <button onClick={() => go('/')} className="flex items-center gap-2 group">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-moss-300">
            <Recycle className="h-4 w-4" strokeWidth={2} />
          </span>
          <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
            ReCircuit
          </span>
        </button>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active = route.path === l.to || (l.to !== '/' && route.path.startsWith(l.to));
            return (
              <button
                key={l.to}
                onClick={() => go(l.to)}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active ? 'text-ink font-medium' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {l.label}
              </button>
            );
          })}
        </nav>

        <div className="hidden md:block">
          <button onClick={() => go('/scan')} className="btn-primary">
            <ScanLine className="h-4 w-4" />
            Scan Device
          </button>
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-ink-soft hover:bg-paper-warm md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-paper-line bg-paper md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2">
            {links.map((l) => (
              <button
                key={l.to}
                onClick={() => go(l.to)}
                className="rounded-md px-3 py-2.5 text-left text-sm text-ink-soft hover:bg-paper-warm"
              >
                {l.label}
              </button>
            ))}
            <button onClick={() => go('/scan')} className="btn-primary mt-2 w-full">
              <ScanLine className="h-4 w-4" />
              Scan Device
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
