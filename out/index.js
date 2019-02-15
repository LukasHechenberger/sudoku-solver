'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/**
 * Solves the giben puzzle
 * @param puzzle The puzzle to solve
 */
function solvePuzzle(puzzle) {
  puzzle.validate();
  const start = Date.now();

  const tryToSolve = current => {
    const {
      complete,
      leastPossible
    } = current.fill();

    if (complete) {
      return current;
    }

    for (const value of leastPossible.possibleValues) {
      const guess = current.clone();
      guess.fillField(leastPossible.index, value);

      try {
        return tryToSolve(guess);
      } catch (err) {// Doesn't work, try next value
      }
    }

    throw new Error('Unable to solve puzzle');
  };

  puzzle.insertValues(tryToSolve(puzzle));
  return {
    duration: Date.now() - start
  };
}

exports.solvePuzzle = solvePuzzle;
//# sourceMappingURL=index.js.map
