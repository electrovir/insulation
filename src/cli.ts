#!/usr/bin/env node

import * as minimist from 'minimist';
import {insulate, InsulationConfig, InvalidDependency} from './index';
import {join} from 'path';
import {readFileSync, existsSync} from 'fs';

const DEFAULT_INSULATION_FILE = '.insulation.json';

export class NotInsulatedError extends Error {
    public name = 'NotInsulatedError';
}

function readConfigFile(dirToCheck: string, loud: boolean, insulationFilePath?: string): InsulationConfig {
    const dirToCheckConfigPath = join(dirToCheck, DEFAULT_INSULATION_FILE);
    const cwdConfigPath = join('.', DEFAULT_INSULATION_FILE);

    let configPathToUse = '';
    if (insulationFilePath && existsSync(insulationFilePath)) {
        configPathToUse = insulationFilePath;
    } else {
        if (!insulationFilePath) {
            if (loud) {
                console.log(`No config file path given`);
            }
        } else if (!existsSync(insulationFilePath)) {
            if (loud) {
                console.log(`Given config file does not exist: "${insulationFilePath}"`);
            }
        }

        if (existsSync(dirToCheckConfigPath)) {
            configPathToUse = dirToCheckConfigPath;
        } else {
            // if this one fails, it fails on the read file step
            configPathToUse = cwdConfigPath;
        }
        if (loud) {
            console.log(`Defaulting config file to "${configPathToUse}"`);
        }
    }

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

            Object.keys(badImportsMapped).forEach(moduleName => {
                console.error(`${moduleName} incorrectly imports:`);
                badImportsMapped[moduleName].forEach(badDependency =>
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

async function cli(dirToCheck: string, loud: boolean, insulationFilePath?: string) {
    const configJson = readConfigFile(dirToCheck, loud, insulationFilePath);

    const {invalidDeps} = await insulate(configJson, dirToCheck, true);

    return handleResults(invalidDeps, loud);
}

function main() {
    const args = minimist(process.argv.slice(2));

    const dirToCheck = (typeof args.d === 'string' && args.d) || './';
    const insulationFilePath = (typeof args.f === 'string' && args.f) || undefined;
    const loud = !args.s;

    cli(dirToCheck, loud, insulationFilePath)
        .then(() => process.exit(0))
        .catch(error => {
            if (error && loud) {
                console.error(error);
            }
            process.exit(1);
        });
}

main();
