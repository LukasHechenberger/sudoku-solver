/* tslint:disable:max-classes-per-file */

import colors from 'chalk';
import { EOL } from 'os';
import stringWidth from 'string-width';
import { AppError } from '../lib/Error';
import { getCoordinates, getIndex, getSquare } from '../lib/helpers';

const indexesIn = {
  col: new Array(9).fill(0).map(() => []),
  row: new Array(9).fill(0).map(() => []),
  square: new Array(9).fill(0).map(() => []),
} as { [key: string]: number[][] };

const position = new Array(81).fill(0)
  .map((_, i) => {
    const [x, y] = getCoordinates(i);
    const square = getSquare(x, y);

    indexesIn.row[y].push(i);
    indexesIn.col[x].push(i);
    indexesIn.square[square].push(i);

    return { x, y, square };
  });

const affectedFields = new Array(81).fill(0).map((_, index) => {
  const { x, y, square } = position[index];
  return Array.from(new Set(
    indexesIn.col[x]
      .concat(indexesIn.row[y])
      .concat(indexesIn.square[square])
      .filter((i) => (i !== index)),
  ));
});

type FieldValue = number | null;
interface FieldPosition { x: number; y: number; }
interface PossibleValues {
  index: number;
  possibleValues: Set<number>;
}

interface BaseFillResult {
  complete: boolean;
  emptyFields: number[];
  iterations: number;
  duration: number;
}

type FillResult<T> = BaseFillResult & (T extends true ? {
  leastPossible: PossibleValues;
} : {
  leastPossible: PossibleValues;
});

function pad(text: string, length: number) {
  const diff = text.length - stringWidth(text);

  return text.padEnd(length + diff);
}

export class PuzzleError extends AppError {

  public puzzle: Puzzle;
  public position?: FieldPosition;

  constructor(message: string, { puzzle, position: pos }: {
    puzzle: Puzzle,
    position?: FieldPosition,
  }) {
    super(message);

    this.puzzle = puzzle;
    this.position = pos;
  }

  get info() {
    return this.puzzle.stringValue({
      highlight: this.position && {
        ...this.position,
        format: colors.underline.bold.red,
      },
    });
  }

}

export default class Puzzle {

  public static parse(puzzleString: string) {
    const values = puzzleString.trim().split('')
      .reduce((result, current) => {
        if (current === EOL) { return result; }

        return result.concat(parseInt(current, 10) || null);
      }, [] as FieldValue[]);

    return new Puzzle({
      values,
    });
  }

  private values: FieldValue[];
  private prefilled: boolean[];

  constructor({ values }: { values: FieldValue[] }) {
    if (values.length !== 81) {
      throw new AppError(`A puzzle must consist of 81 values, got ${values.length}`);
    }

    this.values = values;
    this.prefilled = values.map((v) => Boolean(v));
  }

  public _possibleValues(index: number) {
    return affectedFields[index]
      .reduce((possible, current) => {
        if (index === current) { return possible; }

        const exclude = this.values[current];
        if (exclude) {
          possible.delete(exclude);
        }

        return possible;
      }, new Set<number>([1, 2, 3, 4, 5, 6, 7, 8, 9]));

  }

  public validate() {
    const reportError = (error: Error) => {
      throw error;
    };

    this.values.forEach((value, index) => {
      const possibleValues = this._possibleValues(index);

      if (possibleValues.size === 0) {
        const { x, y } = position[index];

        reportError(new PuzzleError(`Invalid puzzle: ${value ?
            `Field ${x} ${y} cannot contain \`${value}\`` :
            `No values possible in field ${x} ${y}`
          }`, {
          position: { x, y },
          puzzle: this,
        }));
      }
    });
  }

  public fill(): FillResult<boolean> {
    // Prepare stats
    let iterations = 0;
    const start = Date.now();

    // Actual iteration
    let emptyFields = this.values
      .reduce((empty, value, index) => (value ? empty : empty.concat(index)),
        [] as number[]);

    const iterate = (): FillResult<boolean> => {
      iterations++;

      let foundOne = false;
      let leastPossible: { possible: number } & PossibleValues | undefined;

      emptyFields = emptyFields.reduce((empty, index) => {
        const possibleValues = this._possibleValues(index);
        const possible = possibleValues.size;

        if (possible === 0) {
          const { x, y } = position[index];

          throw new PuzzleError(`No values possible in field ${x} ${y}`, {
            position: { x, y },
            puzzle: this,
          });
        } else if (possible === 1) {
          foundOne = true;
          this.values[index] = Array.from(possibleValues)[0];
          return empty;
        } else {
          if (!leastPossible || possible < leastPossible.possible) {
            leastPossible = { possible, index, possibleValues };
          }
        }

        return empty.concat(index);
      }, [] as number[]);

      if (foundOne && emptyFields.length) {
        return iterate();
      }

      return {
        complete: !emptyFields.length,
        duration: Date.now() - start,
        emptyFields,
        iterations,

        // For solver
        leastPossible: (leastPossible as PossibleValues),
      };
    };

    return iterate();
  }

  public fillField(indexOrPosition: number | FieldPosition, value: number) {
    const index = typeof indexOrPosition === 'number' ?
      indexOrPosition :
      getIndex(indexOrPosition.x, indexOrPosition.y);

    this.values[index] = value;
  }

  public insertValues(puzzle: Puzzle) {
    this.values = puzzle.values;
  }

  public stringValue({ highlight, fieldValue }: {
    highlight?: FieldPosition & { format: (text: string) => string },
    fieldValue?: (field: FieldPosition & { square: number, index: number }) => string,
  } = {}) {
    const field = fieldValue || (({ index }) => this.values[index] || ' ');
    const fieldWidth = 1;
    const totalFieldWidth = fieldWidth + 2;

    const line = (start: string, middle: string, end: string = start) => `${start}${
      new Array(3).fill('─'.repeat(3 * totalFieldWidth)).join(middle)
    }${end}`;

    let result = `${line('┌', '┬', '┐')}${EOL}`;

    for (let y = 0; y < 9; y++) {
      if (y === 3 || y === 6) {
        result += `${line('├', '┼', '┤')}${EOL}`;
      }

      for (let x = 0; x < 9; x++) {
        if (x === 0 || x === 3 || x === 6) {
          result += '│';
        }

        const index = getIndex(x, y);
        const square = getSquare(x, y);

        const c = (highlight && highlight.x === x && highlight.y === y && highlight.format) ||
          (!this.prefilled[index] && colors.green) ||
          colors.reset;

        const value = c(`${field({ index, x, y, square })}`);
        result += ` ${pad(value, fieldWidth)} `;
      }

      result += `│${EOL}`;

      if (y === 8) {
        result += line('└', '┴', '┘');
      }
    }

    return result;
  }

  public toString() {
    return this.stringValue();
  }

  public clone(): Puzzle {
    const copy = new Puzzle({
      values: this.values.slice(0),
    });

    copy.prefilled = this.prefilled;

    return copy;
  }

}
