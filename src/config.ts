import {ICruiseOptions as Options} from 'dependency-cruiser';
import {readFileSync} from 'fs';
import {InvalidInsulationConfigError} from './errors/invalid-insulation-config-error';
import {getObjectTypedKeys} from './object';
export {ICruiseOptions as Options} from 'dependency-cruiser';

export type InsulationConfig = {
    imports: {
        [dirPath: string]: {
            allow?: string[];
            block?: string[];
        };
    };
    checkDirectory: string;
    options: Options;
    silent: boolean;
};

export const allowedImportKeys = ['allow', 'block'] as const;
export const defaultExcludes = ['node_modules', 'bower_components'] as const;

export const defaultInsulationFile = '.insulation.json' as const;

export function readInsulationConfigFile(filePath: string): InsulationConfig {
    const json = JSON.parse(readFileSync(filePath).toString());
    return finalizeInsulationConfig(json);
}

export function finalizeInsulationConfig(
    loadedConfig: Partial<InsulationConfig>,
): InsulationConfig {
    const finalizedConfig = {...loadedConfig};
    if (!finalizedConfig.imports) {
        finalizedConfig.imports = {};
    }

    getObjectTypedKeys(finalizedConfig.imports).forEach((dirPath) => {
        const importGroup = finalizedConfig.imports![dirPath];
        const innerKeys = getObjectTypedKeys(importGroup);

        if (typeof importGroup !== 'object') {
            throw new InvalidInsulationConfigError(
                `expected object type for imports['${dirPath}'] but got ${typeof importGroup}`,
                loadedConfig,
            );
        } else if (Array.isArray(importGroup)) {
            throw new InvalidInsulationConfigError(
                `expected an object for imports['${dirPath}'] but got an array`,
                loadedConfig,
            );
        }

        innerKeys.forEach((innerKey) => {
            if (!allowedImportKeys.includes(innerKey)) {
                throw new InvalidInsulationConfigError(
                    `unknown key "${innerKey}" in imports['${dirPath}']`,
                    loadedConfig,
                );
            }
            if (!Array.isArray(importGroup[innerKey])) {
                throw new InvalidInsulationConfigError(
                    `array required for "imports.${dirPath}.${innerKey}"`,
                    loadedConfig,
                );
            }
        });
    });

    if (!finalizedConfig.checkDirectory) {
        finalizedConfig.checkDirectory = './';
    }

    if (!finalizedConfig.options) {
        finalizedConfig.options = {};
    }

    finalizedConfig.options.exclude = `${defaultExcludes.join('|')}|${
        finalizedConfig.options.exclude
    }`;

    if (!finalizedConfig.silent == undefined) {
        finalizedConfig.silent = false;
    }

    return finalizedConfig as InsulationConfig;
}
