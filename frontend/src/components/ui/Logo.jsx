/**
 * Ascending-bars mark: reads as both a rising progress chart ("flow")
 * and stacked structural blocks ("build"). Used instead of a generic
 * letter-in-a-square badge.
 */
export function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#0F9D74" />
      <rect x="8" y="18" width="4" height="8" rx="1" fill="white" />
      <rect x="14" y="13" width="4" height="13" rx="1" fill="white" fillOpacity="0.85" />
      <rect x="20" y="7" width="4" height="19" rx="1" fill="white" fillOpacity="0.7" />
    </svg>
  );
}

export function Logo({ size = 28, dark }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className={`font-display text-[17px] font-bold tracking-tight ${dark ? 'text-white' : 'text-ink'}`}>
        BuildFlow
      </span>
    </div>
  );
}
