import { useEffect, useState } from 'react';
import { Board } from './components/Board';
import { Toolbar } from './components/Toolbar';
import { NumberPad } from './components/NumberPad';
import { DifficultySelect } from './components/DifficultySelect';
import { ThemeToggle } from './components/ThemeToggle';
import { VictoryPanel } from './components/VictoryPanel';
import { LiveRegion } from './components/LiveRegion';
import { useSudokuGame } from './hooks/useSudokuGame';
import { useKeyboardNav } from './hooks/useKeyboardNav';
import { useTimer, fmtTime } from './hooks/useTimer';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { clearHint } from './store/gameSlice';
import type { Theme } from './theme';
import markLight from './imgs/mark-light-512.png';
import markDark from './imgs/mark-dark-512.png';

export default function App() {
  const dispatch = useAppDispatch();
  const { newGame } = useSudokuGame();
  const status = useAppSelector((s) => s.game.status);
  const difficulty = useAppSelector((s) => s.game.difficulty);
  const mistakes = useAppSelector((s) => s.game.mistakes);
  const hintCell = useAppSelector((s) => s.game.hintCell);
  const seconds = useTimer();

  const generating = status === 'generating';
  useKeyboardNav(status === 'playing' || status === 'solved');

  const [theme] = useState<Theme>(
    () => (document.documentElement.dataset.theme as Theme) ?? 'light',
  );

  // Start the first game on mount.
  useEffect(() => {
    void newGame('easy');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear the transient hint highlight after ~1.2s (DESIGN.md §5.3).
  useEffect(() => {
    if (!hintCell) return undefined;
    const id = window.setTimeout(() => dispatch(clearHint()), 1200);
    return () => window.clearTimeout(id);
  }, [hintCell, dispatch]);

  return (
    <div className="sz-app sz-root">
      <div className="sz-game">
        <header className="sz-appbar">
          <span aria-hidden="true" />
          <h1 className="sz-title sz-appbar__title">
            <img
              className="sz-logo sz-logo--light"
              src={markLight}
              alt=""
              width={28}
              height={28}
            />
            <img
              className="sz-logo sz-logo--dark"
              src={markDark}
              alt=""
              width={28}
              height={28}
            />
            SudokuZen
          </h1>
          <div className="sz-appbar__actions">
            <ThemeToggle initial={theme} />
          </div>
        </header>

        <div className="sz-game__layout">
          <div className="sz-game__board">
            {generating ? (
              <div
                className="sz-board sz-board--loading"
                aria-busy="true"
                aria-label="Gerando tabuleiro"
              >
                <span className="sz-spinner" aria-hidden="true" />
              </div>
            ) : (
              <Board />
            )}
          </div>

          <div className="sz-game__panel">
            <div className="sz-card">
              <div className="sz-hud">
                <DifficultySelect />
                <div className="sz-hud__meta">
                  <span className="sz-hud__item">
                    Erros <strong>{mistakes}</strong>
                  </span>
                  <span className="sz-timer" role="timer" aria-label="Tempo">
                    {fmtTime(seconds)}
                  </span>
                </div>
              </div>

              <Toolbar />
              <NumberPad />

              <div className="sz-game__cta">
                <button
                  type="button"
                  className="sz-btn sz-btn--secondary sz-btn--block"
                  disabled={generating}
                  onClick={() => void newGame(difficulty)}
                >
                  Novo jogo
                </button>
              </div>

              <p className="sz-hint sz-desktop-only">
                Setas movem · 1–9 inserem · N notas · H dica · Backspace apaga ·
                Ctrl+Z desfaz
              </p>
            </div>
          </div>
        </div>

        <VictoryPanel seconds={seconds} />
      </div>

      <LiveRegion />
    </div>
  );
}
