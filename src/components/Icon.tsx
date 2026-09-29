/**
 * Icon — line icons from DESIGN.md §11 (viewBox 0 0 24 24, stroke 1.75, round
 * caps/joins, currentColor). Decorative by default (`aria-hidden`); the label
 * lives on the surrounding button.
 */

export type IconName =
  | 'undo'
  | 'redo'
  | 'erase'
  | 'hint'
  | 'notes'
  | 'check'
  | 'pause'
  | 'restart'
  | 'sun'
  | 'moon';

const ICONS: Record<IconName, string[]> = {
  undo: ['M9 14 4 9l5-5', 'M4 9h10.5a5.5 5.5 0 0 1 0 11H11'],
  redo: ['m15 14 5-5-5-5', 'M20 9H9.5a5.5 5.5 0 0 0 0 11H13'],
  erase: [
    'm7 21-4.3-4.3a1 1 0 0 1 0-1.4l9.6-9.6a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 0 1 0 1.4L13 21',
    'M22 21H7',
    'm5 11 9 9',
  ],
  hint: [
    'M9 18h6',
    'M10 22h4',
    'M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z',
  ],
  notes: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'],
  check: ['M20 6 9 17l-5-5'],
  pause: ['M9 5v14', 'M15 5v14'],
  restart: ['M3 12a9 9 0 1 0 3-6.7L3 8', 'M3 3v5h5'],
  sun: [
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    'M12 2v2',
    'M12 20v2',
    'm4.9 4.9 1.4 1.4',
    'm17.7 17.7 1.4 1.4',
    'M2 12h2',
    'M20 12h2',
    'm4.9 19.1 1.4-1.4',
    'm17.7 6.3 1.4-1.4',
  ],
  moon: ['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'],
};

interface IconProps {
  name: IconName;
}

export function Icon({ name }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
