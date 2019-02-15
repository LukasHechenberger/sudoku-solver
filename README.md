# @lhechenberger/sudoku-solver

> A simple sudoku solver implemented in TypeScript. Loosely based on [a post by Peter Norvig](http://norvig.com/sudoku.html).
>
> This is just a research project.

[![CircleCI](https://circleci.com/gh/LukasHechenberger/sudoku-solver.svg?style=svg&circle-token=0b849565b92de0db918bf78ffb396096bfcd20b8)](https://circleci.com/gh/LukasHechenberger/sudoku-solver)

## Installation

You can either install this package locally by running `npm i -g @lhechenberger/sudoku-solver` or run it directly with `npx @lhechenberger/sudoku-solver [arguments...]`.

## Usage

```
Usage: sudoku-solver [command=solve] [options...]

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
  --version, -v Print version                       [boolean]
```

(see tests for the file structure)
