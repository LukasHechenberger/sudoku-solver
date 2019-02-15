import colors from 'chalk';
import { readFile as _readFile } from 'fs';
import parseArgs from 'mri';
import { EOL } from 'os';
import ms from 'pretty-ms';
import { promisify } from 'util';
import { solvePuzzle } from '.';
import { bin, version } from '../package.json';
import { AppError } from './lib/Error';
import Puzzle from './model/Puzzle';

const readFile = promisify(_readFile);

const parserOptions = {
  alias: {
    'all-at': ['a', 'allAt'],
    'f': 'file',
    'h': 'help',
    'p': 'puzzle',
    'v': 'version',
  },
  string: ['file', 'puzzle', 'all-at'],
};

interface CliArgs {
  _: string[];
  help?: boolean;
  version?: boolean;
  file?: string;
  puzzle?: string;
  allAt?: string;
}

/* tslint:disable:no-console */
const print = console.log;
const printError = console.log;
/* tslint:enable:no-console */

export function printPuzzle(puzzle: Puzzle, options = {}) {
  print(puzzle.stringValue(options));
}

const name = Object.keys(bin)[0];
const usage = `Usage: ${name} [command=solve] [options...]

Available commands:

  solve         Solve puzzles
  print         Print puzzles
  validate      Valdate puzzles

Specify a puzzle:

  --file, -f    Read puzzle from file               [string]
  --puzzle, -p  Specify puzzle directly             [string]
  --all-at      Read puzzles line-by-line from file [string]

Generall options:

  --help, -h    Show this help                      [boolean]
  --version, -v Print version                       [boolean]`;

export function printUsage() {
  print(usage);
}

class UsageError extends AppError {

  get info() {
    return usage;
  }

}

const readPuzzleFile = (path: string) => readFile(path, 'utf8').catch((err) => {
  if (err.code === 'ENOENT') {
    throw new AppError(`No file at path \`${path}\``);
  }

  throw err;
});

function getOptions() {
  const parsed = parseArgs(process.argv.slice(2), parserOptions) as parseArgs.Argv & {
    _: string[],
  };
  const command = parsed._[0];

  if (command === 'version') {
    parsed.version = true;
    parsed._.shift();
  } else if (command === 'help') {
    parsed.help = true;
    parsed._.shift();
  }

  return parsed as CliArgs;
}

export async function runCli() {
  const {
    _: [command = 'solve', ...additionalArgs],
    puzzle: puzzleOption,
    file,
    allAt,
    help,
    version: versionOption,
  } = getOptions();

  if (additionalArgs.length) {
    throw new UsageError(`Unknown arguments \`${additionalArgs.join(', ')}\``);
  }

  let puzzles: Puzzle[] = [];
  if (puzzleOption || file) {
    puzzles = [Puzzle.parse(puzzleOption || await readPuzzleFile(file as string))];
  } else if (allAt) {
    puzzles = (await readPuzzleFile(allAt)).split(EOL)
      .reduce((all, line) => (line.trim()) ? all.concat(Puzzle.parse(line)) : all, [] as Puzzle[]);
  } else if (!versionOption && !help) {
    throw new UsageError('Specify a puzzle using the `--file`, `--puzzle` or `--all-at` option');
  }

  if (command === 'help' || help) {
    print(usage);
  } else if (command === 'version' || versionOption) {
    print(version);
  } else if (command === 'print') {
    puzzles.forEach((puzzle) => printPuzzle(puzzle));
  } else if (command === 'validate') {
    puzzles.forEach((puzzle) => puzzle.validate());
  } else if (command === 'solve') {
    const durations = puzzles.map((puzzle) => {
      const { duration } = solvePuzzle(puzzle);
      printPuzzle(puzzle);

      return duration;
    });

    const stats = durations.reduce((s, current) => ({
      max: Math.max(current, s.max),
      min: Math.min(current, s.min),
      sum: s.sum + current,
    }), { max: 0, min: Infinity, sum: 0 });

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
  process.title = name;
  runCli()
    .catch((err) => {
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
