/**
 * useKeyboardNav — global keyboard handling (prompt §4).
 *
 * Arrow keys move the selection fluidly across all 81 cells (with edge
 * wrapping); digits 1-9 enter values/notes; Backspace/Delete/0 erase; N toggles
 * notes mode; Ctrl/Cmd+Z / +Y (or +Shift+Z) undo/redo. Handlers are attached to
 * `window` so navigation works no matter which cell (if any) holds DOM focus.
 */
import { useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import {
  eraseCell,
  hint,
  inputDigit,
  moveSelection,
  redo,
  toggleNotesMode,
  undo,
} from '../store/gameSlice';

export function useKeyboardNav(enabled: boolean) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!enabled) return undefined;

    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in an actual text input.
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      ) {
        return;
      }

      const mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        dispatch(e.shiftKey ? redo() : undo());
        return;
      }
      if (mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        dispatch(redo());
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          dispatch(moveSelection({ dRow: -1, dCol: 0 }));
          break;
        case 'ArrowDown':
          e.preventDefault();
          dispatch(moveSelection({ dRow: 1, dCol: 0 }));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          dispatch(moveSelection({ dRow: 0, dCol: -1 }));
          break;
        case 'ArrowRight':
          e.preventDefault();
          dispatch(moveSelection({ dRow: 0, dCol: 1 }));
          break;
        case 'Backspace':
        case 'Delete':
        case '0':
          e.preventDefault();
          dispatch(eraseCell());
          break;
        case 'n':
        case 'N':
          dispatch(toggleNotesMode());
          break;
        case 'h':
        case 'H':
          dispatch(hint());
          break;
        default:
          if (e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            dispatch(inputDigit(Number(e.key)));
          }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch, enabled]);
}
