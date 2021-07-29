import {posix, sep} from 'path';

export function posixToWin(input: string): string {
    return input.split(posix.sep).join(sep);
}
