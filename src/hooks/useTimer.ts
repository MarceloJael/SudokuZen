/**
 * useTimer — game clock. Counts up once per second while the game is being
 * played, pauses when the tab is hidden (DESIGN.md §5.7), stops on victory, and
 * resets whenever a new puzzle is loaded (detected by the `initialGrid`
 * reference changing).
 */
import { useEffect, useRef, useState } from 'react';
import { useAppSelector } from '../store/hooks';

export const fmtTime = (s: number): string =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export function useTimer(): number {
  const status = useAppSelector((s) => s.game.status);
  const initialGrid = useAppSelector((s) => s.game.initialGrid);
  const [seconds, setSeconds] = useState(0);

  // Reset the clock each time a fresh puzzle is installed.
  const lastGrid = useRef(initialGrid);
  useEffect(() => {
    if (initialGrid !== lastGrid.current) {
      lastGrid.current = initialGrid;
      setSeconds(0);
    }
  }, [initialGrid]);

  useEffect(() => {
    if (status !== 'playing') return undefined;
    const tick = () => {
      if (!document.hidden) setSeconds((s) => s + 1);
    };
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [status]);

  return seconds;
}
