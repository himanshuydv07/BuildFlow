import clsx from 'clsx';

const ACCENT_BORDER = {
  none: '',
  signal: 'border-l-[3px] border-l-signal',
  coral: 'border-l-[3px] border-l-coral',
  amber: 'border-l-[3px] border-l-amber',
  indigo: 'border-l-[3px] border-l-indigo',
};

export function Card({ className, accent = 'none', hover, children, ...props }) {
  return (
    <div
      className={clsx(
        'rounded-md border border-line bg-white shadow-card',
        ACCENT_BORDER[accent],
        hover && 'transition-all duration-150 hover:-translate-y-0.5 hover:shadow-pop hover:border-ink-faint/40',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

const badgeTones = {
  neutral: 'bg-paper text-ink-muted',
  signal: 'bg-signal-faint text-signal-dim',
  coral: 'bg-coral-faint text-coral',
  amber: 'bg-amber-faint text-amber',
  indigo: 'bg-indigo-faint text-indigo',
};

const dotTones = {
  neutral: 'bg-ink-faint',
  signal: 'bg-signal',
  coral: 'bg-coral',
  amber: 'bg-amber',
  indigo: 'bg-indigo',
};

export function Badge({ tone = 'neutral', dot, className, children }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        badgeTones[tone],
        className
      )}
    >
      {dot && <span className={clsx('h-1.5 w-1.5 rounded-full', dotTones[tone])} />}
      {children}
    </span>
  );
}

const STATUS_TONE = { TODO: 'neutral', IN_PROGRESS: 'indigo', REVIEW: 'amber', BLOCKED: 'coral', DONE: 'signal' };
const PRIORITY_TONE = { LOW: 'neutral', MEDIUM: 'indigo', HIGH: 'amber', CRITICAL: 'coral' };
const ROLE_TONE = { OWNER: 'signal', ADMIN: 'indigo', MEMBER: 'neutral', VIEWER: 'neutral' };

export function StatusBadge({ status }) {
  return (
    <Badge tone={STATUS_TONE[status] || 'neutral'} dot>
      {status?.replace('_', ' ')}
    </Badge>
  );
}
export function PriorityBadge({ priority }) {
  return <Badge tone={PRIORITY_TONE[priority] || 'neutral'}>{priority}</Badge>;
}
export function RoleBadge({ role }) {
  return <Badge tone={ROLE_TONE[role] || 'neutral'}>{role}</Badge>;
}

export function ProgressBar({ value = 0, tone = 'signal', className }) {
  const bg = {
    signal: 'bg-gradient-to-r from-signal to-signal-dim',
    coral: 'bg-coral',
    amber: 'bg-amber',
    indigo: 'bg-indigo',
  }[tone] || 'bg-signal';
  return (
    <div className={clsx('h-1.5 w-full overflow-hidden rounded-full bg-line', className)}>
      <div
        className={clsx('h-full rounded-full transition-all duration-300', bg)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

const AVATAR_COLORS = ['#0F9D74', '#6C63D6', '#DB9A1F', '#E1493F', '#2F6FED', '#0A7A5A'];
function colorFor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function Avatar({ name = '?', size = 8, className }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div
      className={clsx('flex shrink-0 items-center justify-center rounded-full font-semibold text-white', className)}
      style={{
        backgroundColor: colorFor(name),
        width: `${size * 4}px`,
        height: `${size * 4}px`,
        fontSize: `${size * 1.4}px`,
      }}
      title={name}
    >
      {initials}
    </div>
  );
}

export function AvatarStack({ names = [], max = 4 }) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((n, i) => (
        <Avatar key={i} name={n} size={7} className="ring-2 ring-white" />
      ))}
      {rest > 0 && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-line text-xs font-semibold text-ink-muted ring-2 ring-white">
          +{rest}
        </div>
      )}
    </div>
  );
}
