/**
 * Toolbar — the primary in-game actions as icon buttons (DESIGN.md §5.2):
 * undo, redo, erase, notes toggle and hint (with remaining-count badge).
 */
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  eraseCell,
  hint,
  redo,
  toggleNotesMode,
  undo,
} from '../store/gameSlice';
import { selectCanRedo, selectCanUndo } from '../store/selectors';
import { IconButton } from './IconButton';

export function Toolbar() {
  const dispatch = useAppDispatch();
  const canUndo = useAppSelector(selectCanUndo);
  const canRedo = useAppSelector(selectCanRedo);
  const notesMode = useAppSelector((s) => s.game.notesMode);
  const hintsLeft = useAppSelector((s) => s.game.hintsLeft);

  return (
    <div className="sz-toolbar" role="group" aria-label="Ações">
      <IconButton
        icon="undo"
        label="Desfazer"
        onClick={() => dispatch(undo())}
        disabled={!canUndo}
      />
      <IconButton
        icon="redo"
        label="Refazer"
        onClick={() => dispatch(redo())}
        disabled={!canRedo}
      />
      <IconButton
        icon="erase"
        label="Apagar"
        onClick={() => dispatch(eraseCell())}
      />
      <IconButton
        icon="notes"
        label="Notas"
        pressed={notesMode}
        onClick={() => dispatch(toggleNotesMode())}
      />
      <IconButton
        icon="hint"
        label="Dica"
        badge={hintsLeft}
        disabled={hintsLeft <= 0}
        onClick={() => dispatch(hint())}
      />
    </div>
  );
}
