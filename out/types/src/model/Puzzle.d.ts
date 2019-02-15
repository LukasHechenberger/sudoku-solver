import { AppError } from '../lib/Error';
declare type FieldValue = number | null;
interface FieldPosition {
    x: number;
    y: number;
}
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
declare type FillResult<T> = BaseFillResult & (T extends true ? {
    leastPossible: PossibleValues;
} : {
    leastPossible: PossibleValues;
});
export declare class PuzzleError extends AppError {
    puzzle: Puzzle;
    position?: FieldPosition;
    constructor(message: string, { puzzle, position: pos }: {
        puzzle: Puzzle;
        position?: FieldPosition;
    });
    readonly info: string;
}
export default class Puzzle {
    static parse(puzzleString: string): Puzzle;
    private values;
    private prefilled;
    constructor({ values }: {
        values: FieldValue[];
    });
    _possibleValues(index: number): Set<number>;
    validate(): void;
    fill(): FillResult<boolean>;
    fillField(indexOrPosition: number | FieldPosition, value: number): void;
    insertValues(puzzle: Puzzle): void;
    stringValue({ highlight, fieldValue }?: {
        highlight?: FieldPosition & {
            format: (text: string) => string;
        };
        fieldValue?: (field: FieldPosition & {
            square: number;
            index: number;
        }) => string;
    }): string;
    toString(): string;
    clone(): Puzzle;
}
export {};
