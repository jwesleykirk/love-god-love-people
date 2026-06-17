type IconProps = { className?: string; size?: number };

export function IconHome({ className = "bn-icon", size = 22 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth="1.9" strokeLinejoin="round" strokeLinecap="round">
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M5.6 10.4V19h12.8v-8.6" />
    </svg>
  );
}

export function IconPeople({ className = "bn-icon", size = 22 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19c0-3.4 2.9-5.6 6.5-5.6s6.5 2.2 6.5 5.6" />
    </svg>
  );
}

export function IconPrayer({ className = "bn-icon", size = 22 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M12 4c2.2 3 4 4.4 4 8a4 4 0 0 1-8 0c0-2.2 1-3.4 2.2-4.6.1 1.2.8 1.9 1.4 2.2C12.2 8.6 10.6 6.4 12 4z" />
    </svg>
  );
}

export function IconJournal({ className = "bn-icon", size = 22 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M5.5 5.5A1.5 1.5 0 0 1 7 4h11v15.5H7a1.5 1.5 0 0 0-1.5 1.5z" />
      <path d="M5.5 19.5A1.5 1.5 0 0 1 7 18h11" />
    </svg>
  );
}

export function IconSettings({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 2.6v3M12 18.4v3M21.4 12h-3M5.6 12h-3M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M18.4 18.4l-2.1-2.1M7.7 7.7 5.6 5.6" />
    </svg>
  );
}

export function IconSearch({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#8A8A86" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

export function IconPlus({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconChevronDown({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9.5 12 15l6-5.5" />
    </svg>
  );
}

export function IconPlay({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export function IconPause({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

export function IconSkipBack({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a7 7 0 1 1-6.3 4" />
      <path d="M5.5 4.5V9h4.5" />
    </svg>
  );
}

export function IconSkipForward({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a7 7 0 1 0 6.3 4" />
      <path d="M18.5 4.5V9H14" />
    </svg>
  );
}
