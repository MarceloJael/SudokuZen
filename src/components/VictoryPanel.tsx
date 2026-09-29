/**
 * VictoryPanel — modal shown when the puzzle is solved (DESIGN.md §5.6).
 * A dialog with a success seal, run stats (time, mistakes, hints used) and a
 * single primary "Novo jogo" action. Appears ~900ms after the victory wave.
 */
import { useEffect, useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { useSudokuGame } from '../hooks/useSudokuGame';
import { Icon } from './Icon';
import { fmtTime } from '../hooks/useTimer';
import type { Difficulty } from '../engine/types';

const LABELS: Record<Difficulty, string> = {
  easy: 'fácil',
  medium: 'médio',
  extreme: 'extremo',
};

interface VictoryPanelProps {
  seconds: number;
}

export function VictoryPanel({ seconds }: VictoryPanelProps) {
  const solved = useAppSelector((s) => s.game.status === 'solved');
  const difficulty = useAppSelector((s) => s.game.difficulty);
  const mistakes = useAppSelector((s) => s.game.mistakes);
  const hintsLeft = useAppSelector((s) => s.game.hintsLeft);
  const { newGame } = useSudokuGame();
  const [open, setOpen] = useState(false);

  // Wait for the diagonal victory wave before revealing the dialog.
  useEffect(() => {
    if (!solved) {
      setOpen(false);
      return;
    }
    const id = window.setTimeout(() => setOpen(true), 900);
    return () => window.clearTimeout(id);
  }, [solved]);

  if (!solved || !open) return null;

  return (
    <div className="sz-scrim">
      <div
        className="sz-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sz-victory-title"
      >
        <div className="sz-dialog__seal">
          <Icon name="check" />
        </div>
        <h2 className="sz-dialog__title" id="sz-victory-title">
          Resolvido
        </h2>
        <p className="sz-dialog__sub">Sudoku {LABELS[difficulty]} concluído.</p>
        <dl className="sz-stats">
          <div>
            <dt>Tempo</dt>
            <dd>{fmtTime(seconds)}</dd>
          </div>
          <div>
            <dt>Erros</dt>
            <dd>{mistakes}</dd>
          </div>
          <div>
            <dt>Dicas</dt>
            <dd>{3 - hintsLeft}</dd>
          </div>
        </dl>
        <button
          type="button"
          className="sz-btn sz-btn--primary sz-btn--lg sz-btn--block"
          autoFocus
          onClick={() => void newGame(difficulty)}
        >
          Novo jogo
        </button>
      </div>
    </div>
  );
}
