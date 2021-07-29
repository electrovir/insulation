#!/usr/bin/env node

import {existsSync, readFileSync} from 'fs';
import {resolve} from 'path';
import {insulate, InsulationConfig, InvalidDependency} from './index';

const DEFAULT_INSULATION_FILE = '.insulation.json';

export class NotInsulatedError extends Error {
    public name = 'NotInsulatedError';
}

function readConfigFile(insulationFilePath?: string): InsulationConfig {
    const configPathToUse =
        insulationFilePath && existsSync(insulationFilePath)
            ? insulationFilePath
            : resolve('.', DEFAULT_INSULATION_FILE);

    return JSON.parse(readFileSync(configPathToUse).toString());
}

function handleResults(invalidDeps: InvalidDependency[], loud: boolean) {
    if (invalidDeps.length > 0) {
        if (loud) {
            const badImportsMapped = invalidDeps.reduce(
                (accum: {[key: string]: InvalidDependency[]}, invalidDependency) => {
                    if (!accum.hasOwnProperty(invalidDependency.importedBy)) {
                        accum[invalidDependency.importedBy] = [];
                    }
                    accum[invalidDependency.importedBy].push(invalidDependency);
                    return accum;
                },
                {},
            );

            Object.keys(badImportsMapped).forEach((moduleName) => {
                console.error(`${moduleName} incorrectly imports:`);
                badImportsMapped[moduleName].forEach((badDependency) =>
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
        const {invalidDeps} = await insulate(configJson, true);
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
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

main();
