import clsx from 'clsx';

const variants = {
  primary:
    'bg-signal text-white shadow-sm hover:bg-signal-dim active:scale-[0.98] shadow-inset',
  secondary:
    'bg-white text-ink border border-line hover:border-ink-faint hover:bg-paper active:scale-[0.98]',
  ghost: 'text-ink-muted hover:bg-paper hover:text-ink',
  danger: 'bg-coral text-white hover:opacity-90 active:scale-[0.98]',
  subtle: 'bg-signal-faint text-signal-dim hover:bg-signal/15',
};

const sizes = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-[15px] px-5 py-2.5',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  loading,
  children,
  disabled,
  ...props
}) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
