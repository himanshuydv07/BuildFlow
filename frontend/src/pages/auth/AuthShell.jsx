import { Logo } from '../../components/ui/Logo';

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-sidebar-gradient p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />
        <div className="relative">
          <Logo dark />
        </div>
        <div className="relative">
          <StackedBars />
          <h1 className="mt-8 max-w-sm font-display text-3xl font-bold leading-tight">
            Build the plan. Watch it move.
          </h1>
          <p className="mt-3 max-w-sm text-sm text-white/50">
            One workspace for every project you own, and every project someone shares with you — each with its own team and its own permissions.
          </p>
        </div>
        <p className="relative text-xs text-white/30">Project-scoped roles. No global admin required.</p>
      </div>

      <div className="flex w-full flex-col items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

function StackedBars() {
  const bars = [40, 65, 50, 85, 70, 100];
  return (
    <div className="flex h-16 items-end gap-2">
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-5 rounded-t-sm bg-signal"
          style={{ height: `${h}%`, opacity: 0.4 + (i / bars.length) * 0.6 }}
        />
      ))}
    </div>
  );
}
