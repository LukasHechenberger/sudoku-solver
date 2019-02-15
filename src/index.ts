import Puzzle from './model/Puzzle';

/**
 * Solves the giben puzzle
 * @param puzzle The puzzle to solve
 */
export function solvePuzzle(puzzle: Puzzle) {
  puzzle.validate();

  const start = Date.now();
  const tryToSolve = (current: Puzzle): Puzzle => {
    const { complete, leastPossible } = current.fill();

    if (complete) { return current; }

    for (const value of leastPossible.possibleValues) {
      const guess = current.clone();
      guess.fillField(leastPossible.index, value);

      try {
        return tryToSolve(guess);
      } catch (err) {
        // Doesn't work, try next value
      }
    }

    throw new Error('Unable to solve puzzle');
  };

  puzzle.insertValues(tryToSolve(puzzle));

  return {
    duration: Date.now() - start,
  };
}
