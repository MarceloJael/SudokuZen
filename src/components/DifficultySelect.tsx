/**
 * DifficultySelect — segmented control that starts a new game at the chosen
 * level. Uses `aria-pressed` to convey the active option (not colour alone).
 */
import { useAppSelector } from '../store/hooks';
import { useSudokuGame } from '../hooks/useSudokuGame';
import type { Difficulty } from '../engine/types';

const LEVELS: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Fácil' },
  { id: 'medium', label: 'Médio' },
  { id: 'extreme', label: 'Extremo' },
];

export function DifficultySelect() {
  const { newGame } = useSudokuGame();
  const difficulty = useAppSelector((s) => s.game.difficulty);
  const generating = useAppSelector((s) => s.game.status === 'generating');

  return (
    <div className="sz-seg" role="group" aria-label="Dificuldade">
      {LEVELS.map((level) => (
        <button
          key={level.id}
          type="button"
          className="sz-seg__opt"
          aria-pressed={difficulty === level.id}
          disabled={generating}
          onClick={() => void newGame(level.id)}
        >
          {level.label}
        </button>
      ))}
    </div>
  );
}
