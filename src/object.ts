export function getObjectTypedKeys<T extends object>(input: T): (keyof T)[] {
    return Object.keys(input) as (keyof T)[];
}
