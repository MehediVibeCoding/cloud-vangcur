'use client';

interface UserAvatarProps {
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  isAdmin?: boolean;
  className?: string;
}

const AVATAR_COLORS = [
  'bg-gradient-to-br from-blue-500 to-indigo-600',
  'bg-gradient-to-br from-emerald-500 to-teal-600',
  'bg-gradient-to-br from-amber-500 to-orange-600',
  'bg-gradient-to-br from-rose-500 to-pink-600',
  'bg-gradient-to-br from-purple-500 to-violet-600',
  'bg-gradient-to-br from-cyan-500 to-blue-600',
];

function getInitials(name?: string): string {
  const clean = (name || '?').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getColorClass(name?: string, isAdmin?: boolean): string {
  if (isAdmin) {
    return 'bg-white ring-2 ring-brand-light/50';
  }
  const str = (name || 'user').trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return `${AVATAR_COLORS[index]} text-white`;
}

export default function UserAvatar({
  name = 'User',
  size = 'md',
  isAdmin = false,
  className = '',
}: UserAvatarProps) {
  const initials = getInitials(name);
  const colorClass = getColorClass(name, isAdmin);

  const sizeClasses = {
    sm: 'h-7 w-7 text-[10.5px]',
    md: 'h-9 w-9 text-[12px]',
    lg: 'h-11 w-11 text-[14px]',
  }[size];

  // 🆕 অ্যাডমিন/Vangcur টিমের জন্য ইনিশিয়ালের বদলে আসল লোগো (গোল করে ক্রপ করা) দেখানো হয়
  if (isAdmin) {
    return (
      <div
        title={name}
        aria-label={name}
        className={`flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full shadow-sm ${sizeClasses} ${colorClass} ${className}`}
      >
        <img
          src="/vangcur-team-avatar.png"
          alt="Vangcur Team"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      title={name}
      aria-label={name}
      className={`flex shrink-0 select-none items-center justify-center rounded-full font-body font-bold shadow-sm ${sizeClasses} ${colorClass} ${className}`}
    >
      {initials}
    </div>
  );
}
