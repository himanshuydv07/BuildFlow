import clsx from 'clsx';

const fieldClass =
  'w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal transition-colors';

export function Label({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
      {children}
    </label>
  );
}

export function Input({ className, error, ...props }) {
  return (
    <>
      <input className={clsx(fieldClass, error && 'border-coral focus:border-coral focus:ring-coral', className)} {...props} />
      {error && <p className="mt-1 text-xs text-coral">{error}</p>}
    </>
  );
}

export function Textarea({ className, error, ...props }) {
  return (
    <>
      <textarea className={clsx(fieldClass, 'resize-none', error && 'border-coral', className)} {...props} />
      {error && <p className="mt-1 text-xs text-coral">{error}</p>}
    </>
  );
}

export function Select({ className, children, ...props }) {
  return (
    <select className={clsx(fieldClass, 'cursor-pointer', className)} {...props}>
      {children}
    </select>
  );
}

export function FormField({ label, htmlFor, error, children }) {
  return (
    <div>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {error && <p className="mt-1 text-xs text-coral">{error}</p>}
    </div>
  );
}
