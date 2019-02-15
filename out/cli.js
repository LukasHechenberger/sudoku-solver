#!/usr/bin/env node

'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var index = require('./index.js');
var colors = _interopDefault(require('chalk'));
var fs = require('fs');
var parseArgs = _interopDefault(require('mri'));
var os = require('os');
var ms = _interopDefault(require('pretty-ms'));
var util = require('util');
var stringWidth = _interopDefault(require('string-width'));

var version = "0.1.0";
var bin = {
	"sudoku-solver": "out/cli.js"
};

class AppError extends Error {
  constructor(message) {
    super(message); // Ensure the name of this error is the same as the class name

    this.name = this.constructor.name; // This clips the constructor invocation from the stack trace.
    // It's not absolutely essential, but it does make the stack trace a little nicer.
    //  @see Node.js reference (bottom)

    Error.captureStackTrace(this, this.constructor);
  }

  get info() {
    return null;
  }

}

function getCoordinates(index$$1) {
  return [index$$1 % 9, // col
  Math.floor(index$$1 / 9)];
}
function getSquare(x, y) {
  return Math.floor(x / 3 % 3) + Math.floor(y / 3) * 3;
}
function getIndex(x, y) {
  return y * 9 + x;
}

/* tslint:disable:max-classes-per-file */
const indexesIn = {
  col: new Array(9).fill(0).map(() => []),
  row: new Array(9).fill(0).map(() => []),
  square: new Array(9).fill(0).map(() => [])
};
const position = new Array(81).fill(0).map((_, i) => {
  const [x, y] = getCoordinates(i);
  const square = getSquare(x, y);
  indexesIn.row[y].push(i);
  indexesIn.col[x].push(i);
  indexesIn.square[square].push(i);
  return {
    x,
    y,
    square
  };
});
const affectedFields = new Array(81).fill(0).map((_, index$$1) => {
  const {
    x,
    y,
    square
  } = position[index$$1];
  return Array.from(new Set(indexesIn.col[x].concat(indexesIn.row[y]).concat(indexesIn.square[square]).filter(i => i !== index$$1)));
});

function pad(text, length) {
  const diff = text.length - stringWidth(text);
  return text.padEnd(length + diff);
}

class PuzzleError extends AppError {
  constructor(message, {
    puzzle,
    position: pos
  }) {
    super(message);
    this.puzzle = puzzle;
    this.position = pos;
  }

  get info() {
    return this.puzzle.stringValue({
      highlight: this.position && { ...this.position,
        format: colors.underline.bold.red
      }
    });
  }

}
class Puzzle {
  static parse(puzzleString) {
    const values = puzzleString.trim().split('').reduce((result, current) => {
      if (current === os.EOL) {
        return result;
      }

      return result.concat(parseInt(current, 10) || null);
    }, []);
    return new Puzzle({
      values
    });
  }

  constructor({
    values
  }) {
    if (values.length !== 81) {
      throw new AppError(`A puzzle must consist of 81 values, got ${values.length}`);
    }

    this.values = values;
    this.prefilled = values.map(v => Boolean(v));
  }

  _possibleValues(index$$1) {
    return affectedFields[index$$1].reduce((possible, current) => {
      if (index$$1 === current) {
        return possible;
      }

      const exclude = this.values[current];

      if (exclude) {
        possible.delete(exclude);
      }

      return possible;
    }, new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]));
  }

  validate() {
    const reportError = error => {
      throw error;
    };

    this.values.forEach((value, index$$1) => {
      const possibleValues = this._possibleValues(index$$1);

      if (possibleValues.size === 0) {
        const {
          x,
          y
        } = position[index$$1];
        reportError(new PuzzleError(`Invalid puzzle: ${value ? `Field ${x} ${y} cannot contain \`${value}\`` : `No values possible in field ${x} ${y}`}`, {
          position: {
            x,
            y
          },
          puzzle: this
        }));
      }
    });
  }

  fill() {
    // Prepare stats
    let iterations = 0;
    const start = Date.now(); // Actual iteration

    let emptyFields = this.values.reduce((empty, value, index$$1) => value ? empty : empty.concat(index$$1), []);

    const iterate = () => {
      iterations++;
      let foundOne = false;
      let leastPossible;
      emptyFields = emptyFields.reduce((empty, index$$1) => {
        const possibleValues = this._possibleValues(index$$1);

        const possible = possibleValues.size;

        if (possible === 0) {
          const {
            x,
            y
          } = position[index$$1];
          throw new PuzzleError(`No values possible in field ${x} ${y}`, {
            position: {
              x,
              y
            },
            puzzle: this
          });
        } else if (possible === 1) {
          foundOne = true;
          this.values[index$$1] = Array.from(possibleValues)[0];
          return empty;
        } else {
          if (!leastPossible || possible < leastPossible.possible) {
            leastPossible = {
              possible,
              index: index$$1,
              possibleValues
            };
          }
        }

        return empty.concat(index$$1);
      }, []);

      if (foundOne && emptyFields.length) {
        return iterate();
      }

      return {
        complete: !emptyFields.length,
        duration: Date.now() - start,
        emptyFields,
        iterations,
        // For solver
        leastPossible: leastPossible
      };
    };

    return iterate();
  }

  fillField(indexOrPosition, value) {
    const index$$1 = typeof indexOrPosition === 'number' ? indexOrPosition : getIndex(indexOrPosition.x, indexOrPosition.y);
    this.values[index$$1] = value;
  }

  insertValues(puzzle) {
    this.values = puzzle.values;
  }

  stringValue({
    highlight,
    fieldValue
  } = {}) {
    const field = fieldValue || (({
      index: index$$1
    }) => this.values[index$$1] || ' ');

    const fieldWidth = 1;
    const totalFieldWidth = fieldWidth + 2;

    const line = (start, middle, end = start) => `${start}${new Array(3).fill('─'.repeat(3 * totalFieldWidth)).join(middle)}${end}`;

    let result = `${line('┌', '┬', '┐')}${os.EOL}`;

    for (let y = 0; y < 9; y++) {
      if (y === 3 || y === 6) {
        result += `${line('├', '┼', '┤')}${os.EOL}`;
      }

      for (let x = 0; x < 9; x++) {
        if (x === 0 || x === 3 || x === 6) {
          result += '│';
        }

        const index$$1 = getIndex(x, y);
        const square = getSquare(x, y);
        const c = highlight && highlight.x === x && highlight.y === y && highlight.format || !this.prefilled[index$$1] && colors.green || colors.reset;
        const value = c(`${field({
          index: index$$1,
          x,
          y,
          square
        })}`);
        result += ` ${pad(value, fieldWidth)} `;
      }

      result += `│${os.EOL}`;

      if (y === 8) {
        result += line('└', '┴', '┘');
      }
    }

    return result;
  }

  toString() {
    return this.stringValue();
  }

  clone() {
    const copy = new Puzzle({
      values: this.values.slice(0)
    });
    copy.prefilled = this.prefilled;
    return copy;
  }

}

const readFile = util.promisify(fs.readFile);
const parserOptions = {
  alias: {
    'all-at': ['a', 'allAt'],
    'f': 'file',
    'h': 'help',
    'p': 'puzzle',
    'v': 'version'
  },
  string: ['file', 'puzzle', 'all-at']
};

/* tslint:disable:no-console */
const print = console.log;
const printError = console.log;
/* tslint:enable:no-console */

function printPuzzle(puzzle, options = {}) {
  print(puzzle.stringValue(options));
}
const name$1 = Object.keys(bin)[0];
const usage = `Usage: ${name$1} [command=solve] [options...]

Available commands:

  solve         Solve puzzles
  print         Print puzzles
  validate      Valdate puzzles

Specify a puzzle:

  --file, -f    Read puzzle from file               [string]
  --puzzle, -p  Specify puzzle directly             [string]
  --all-at      Read puzzles line-by-line from file [string]

General options:

  --help, -h    Show this help                      [boolean]
  --version, -v Print version                       [boolean]`;
function printUsage() {
  print(usage);
}

class UsageError extends AppError {
  get info() {
    return usage;
  }

}

const readPuzzleFile = path => readFile(path, 'utf8').catch(err => {
  if (err.code === 'ENOENT') {
    throw new AppError(`No file at path \`${path}\``);
  }

  throw err;
});

function getOptions() {
  const parsed = parseArgs(process.argv.slice(2), parserOptions);
  const command = parsed._[0];

  if (command === 'version') {
    parsed.version = true;

    parsed._.shift();
  } else if (command === 'help') {
    parsed.help = true;

    parsed._.shift();
  }

  return parsed;
}

async function runCli() {
  const {
    _: [command = 'solve', ...additionalArgs],
    puzzle: puzzleOption,
    file,
    allAt,
    help,
    version: versionOption
  } = getOptions();

  if (additionalArgs.length) {
    throw new UsageError(`Unknown arguments \`${additionalArgs.join(', ')}\``);
  }

  let puzzles = [];

  if (puzzleOption || file) {
    puzzles = [Puzzle.parse(puzzleOption || (await readPuzzleFile(file)))];
  } else if (allAt) {
    puzzles = (await readPuzzleFile(allAt)).split(os.EOL).reduce((all, line) => line.trim() ? all.concat(Puzzle.parse(line)) : all, []);
  } else if (!versionOption && !help) {
    throw new UsageError('Specify a puzzle using the `--file`, `--puzzle` or `--all-at` option');
  }

  if (command === 'help' || help) {
    print(usage);
  } else if (command === 'version' || versionOption) {
    print(version);
  } else if (command === 'print') {
    puzzles.forEach(puzzle => printPuzzle(puzzle));
  } else if (command === 'validate') {
    puzzles.forEach(puzzle => puzzle.validate());
  } else if (command === 'solve') {
    const durations = puzzles.map(puzzle => {
      const {
        duration
      } = index.solvePuzzle(puzzle);
      printPuzzle(puzzle);
      return duration;
    });
    const stats = durations.reduce((s, current) => ({
      max: Math.max(current, s.max),
      min: Math.min(current, s.min),
      sum: s.sum + current
    }), {
      max: 0,
      min: Infinity,
      sum: 0
    });
    print(`Solved ${puzzles.length} puzzles in ${ms(stats.sum)}`);

    if (puzzles.length > 1) {
      print(`  Average: ${ms(stats.sum / durations.length)}`);
      print(`  Minimum: ${ms(stats.min)}`);
      print(`  Maximum: ${ms(stats.max)}`);
    }
  } else {
    throw new UsageError(`Unknown command \`${command}\``);
  }
}

if (!module.parent) {
  process.title = name$1;
  runCli().catch(err => {
    if (err instanceof AppError) {
      const info = err.info;

      if (info) {
        print(info);
        print('');
      }

      printError(colors.red(err.message));
    } else {
      printError(err);
    }

    process.exit(1);
  });
}

exports.printPuzzle = printPuzzle;
exports.printUsage = printUsage;
exports.runCli = runCli;
//# sourceMappingURL=cli.js.map
