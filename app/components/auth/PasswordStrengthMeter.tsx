'use client';

import { useEffect, useState } from 'react';
import { checkPasswordStrength, type PasswordStrength } from '@/lib/passwordStrength';
import { useT } from '@/lib/i18n/useT';

interface PasswordStrengthMeterProps {
  password: string;
}

export default function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const { t } = useT();
  const [strength, setStrength] = useState<PasswordStrength | null>(null);

  useEffect(() => {
    if (!password) {
      setStrength(null);
      return undefined;
    }
    let cancelled = false;
    checkPasswordStrength(password).then((s) => {
      if (!cancelled) setStrength(s);
    });
    return () => {
      cancelled = true;
    };
  }, [password]);

  if (!password || !strength) return null;
  const pct = ((strength.score + 1) / 5) * 100;

  return (
    <div className="mb-1 mt-1.5">
      <div className="h-1 overflow-hidden rounded-full bg-border-base">
        <div
          className="h-full transition-all duration-200"
          style={{ width: `${pct}%`, background: strength.color }}
        />
      </div>
      <div className="mt-[3px] font-body text-[11px] font-semibold" style={{ color: strength.color }}>
        {t(strength.hint)}
      </div>
    </div>
  );
}
