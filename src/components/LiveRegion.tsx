/**
 * LiveRegion — a visually-hidden aria-live area (DESIGN.md §8).
 *
 * Announces high-level game state (generating, solved) and the notes-mode
 * toggle. Per-cell context is announced by the focused gridcell's own
 * aria-label, so this region deliberately stays high-level to avoid duplicate
 * chatter.
 */
import { useMemo } from 'react';
import { useAppSelector } from '../store/hooks';

export function LiveRegion() {
  const status = useAppSelector((s) => s.game.status);
  const notesMode = useAppSelector((s) => s.game.notesMode);

  const message = useMemo(() => {
    if (status === 'generating') return 'Gerando um novo tabuleiro, aguarde.';
    if (status === 'solved') return 'Tabuleiro resolvido.';
    return notesMode ? 'Modo notas ativado.' : 'Modo notas desativado.';
  }, [status, notesMode]);

  return (
    <div
      className="visually-hidden"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {message}
    </div>
  );
}
