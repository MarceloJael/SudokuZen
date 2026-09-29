/**
 * useSudokuGame — owns the Web Worker lifecycle and exposes a `newGame` action.
 *
 * The worker client is created once and torn down on unmount. Generation is
 * async (off the main thread); while it runs the store is in the `generating`
 * state so the UI can show a spinner without ever blocking input.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useAppDispatch } from '../store/hooks';
import { puzzleLoaded, startGeneration } from '../store/gameSlice';
import { SudokuWorkerClient } from '../worker/sudokuWorkerClient';
import type { Difficulty } from '../engine/types';

export function useSudokuGame() {
  const dispatch = useAppDispatch();
  const clientRef = useRef<SudokuWorkerClient | null>(null);

  useEffect(() => {
    clientRef.current = new SudokuWorkerClient();
    return () => {
      clientRef.current?.dispose();
      clientRef.current = null;
    };
  }, []);

  const newGame = useCallback(
    async (difficulty: Difficulty) => {
      dispatch(startGeneration(difficulty));
      const client = clientRef.current;
      if (!client) return;
      try {
        const { puzzle, solution } = await client.generate(difficulty);
        dispatch(puzzleLoaded({ puzzle, solution, difficulty }));
      } catch (err) {
        // Surface generation failures without crashing the app.
        console.error('Failed to generate puzzle', err);
      }
    },
    [dispatch],
  );

  return { newGame };
}
