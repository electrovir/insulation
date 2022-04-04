#!/usr/bin/env node

import {readConfigFile} from '.';
import {insulate} from './api';
import {InvalidDependency} from './dependencies';
import {NotInsulatedError} from './errors/not-insulated-error';

function handleResults(invalidDeps: InvalidDependency[], loud: boolean) {
    if (invalidDeps.length > 0) {
        if (loud) {
            const badImportsMapped = invalidDeps.reduce(
                (accum: Record<string, InvalidDependency[]>, invalidDependency) => {
                    let child = accum[invalidDependency.importedBy];
                    if (!child) {
                        child = [];
                        accum[invalidDependency.importedBy] = child;
                    }

                    child.push(invalidDependency);
                    return accum;
                },
                {},
            );

            Object.keys(badImportsMapped).forEach((moduleName) => {
                const child = badImportsMapped[moduleName] ?? [];
                console.error(`${moduleName} incorrectly imports:`);
                child.forEach((badDependency) =>
                    console.error(`\t${badDependency.dependency.resolved}`),
                );
            });
        }
        throw new NotInsulatedError('Imports not insulated.');
    } else {
        if (loud) {
            console.log('Imports properly insulated.');
        }
        return;
    }
}

async function cli(insulationFilePath?: string) {
    const configJson = readConfigFile(insulationFilePath);
    try {
        const {invalidDeps} = await insulate(configJson, insulationFilePath, true);
        return handleResults(invalidDeps, !configJson.silent);
    } catch (error) {
        if (!configJson.silent) {
            console.error(error);
        }
        throw error;
    }
}

function main() {
    const args = process.argv.slice(2);

    const indexOfFileFlag = args.indexOf('-f');
    const insulationFilePath = indexOfFileFlag > -1 ? args[indexOfFileFlag + 1] : undefined;

    cli(insulationFilePath)
        .then(() => process.exit(0))
        .catch(() => {
            process.exit(1);
        });
}

main();
