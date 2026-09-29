/**
 * ThemeToggle — cycles light → dark → high-contrast. The icon and label reflect
 * the *current* theme; both convey state (not colour alone).
 */
import { useState } from 'react';
import { applyTheme, THEMES, type Theme } from '../theme';
import { IconButton } from './IconButton';
import type { IconName } from './Icon';

const META: Record<Theme, { icon: IconName; label: string }> = {
  light: { icon: 'sun', label: 'Tema claro' },
  dark: { icon: 'moon', label: 'Tema escuro' },
  hc: { icon: 'check', label: 'Alto contraste' },
};

interface ThemeToggleProps {
  initial: Theme;
}

export function ThemeToggle({ initial }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>(initial);

  const next = () => {
    const idx = THEMES.indexOf(theme);
    const value = THEMES[(idx + 1) % THEMES.length]!;
    setTheme(value);
    applyTheme(value);
  };

  const meta = META[theme];
  return (
    <IconButton
      icon={meta.icon}
      label={meta.label}
      showLabel={false}
      onClick={next}
    />
  );
}
