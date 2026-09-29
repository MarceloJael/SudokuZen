/**
 * IconButton — icon + visible caption (DESIGN.md §5.2). `label` is required and
 * becomes the aria-label, title and caption. Supports a pressed toggle state and
 * an optional corner badge (e.g. hints remaining).
 */
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

interface IconButtonProps {
  icon: IconName;
  label: string;
  onClick?: () => void;
  pressed?: boolean;
  disabled?: boolean;
  badge?: ReactNode;
  showLabel?: boolean;
}

export function IconButton({
  icon,
  label,
  onClick,
  pressed,
  disabled,
  badge,
  showLabel = true,
}: IconButtonProps) {
  return (
    <button
      type="button"
      className="sz-iconbtn"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={icon} />
      {badge !== undefined && badge !== null && (
        <span className="sz-iconbtn__badge">{badge}</span>
      )}
      {showLabel && <span className="sz-iconbtn__label">{label}</span>}
    </button>
  );
}
