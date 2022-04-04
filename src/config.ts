import {getObjectTypedKeys} from 'augment-vir';
import {replaceWithWindowsPathIfNeeded} from 'augment-vir/dist/node-only';
import {ICruiseOptions as Options} from 'dependency-cruiser';
import {existsSync, readFileSync} from 'fs';
import {resolve} from 'path';
import {InvalidInsulationConfigError} from './errors/invalid-insulation-config-error';

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

const allowedImportKeys = [
    'allow',
    'block',
] as const;
const defaultExcludes = [
    'node_modules',
    'bower_components',
] as const;

const defaultInsulationFile = '.insulation.json' as const;

export function readConfigFile(insulationFilePath?: string): InsulationConfig {
    const configPathToUse =
        insulationFilePath && existsSync(insulationFilePath)
            ? insulationFilePath
            : resolve('.', defaultInsulationFile);

    const json = JSON.parse(readFileSync(configPathToUse).toString());
    return json;
}

function fixPaths(config: InsulationConfig): InsulationConfig {
    const fixedDir = replaceWithWindowsPathIfNeeded(config.checkDirectory);
    return {
        ...config,
        checkDirectory: fixedDir,
    };
}

export function finalizeInsulationConfig(
    loadedConfig: Partial<InsulationConfig>,
    configFilePath: string | undefined,
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
                configFilePath,
                loadedConfig,
            );
        } else if (Array.isArray(importGroup)) {
            throw new InvalidInsulationConfigError(
                `expected an object for imports['${dirPath}'] but got an array`,
                configFilePath,
                loadedConfig,
            );
        }

        innerKeys.forEach((innerKey) => {
            if (!allowedImportKeys.includes(innerKey)) {
                throw new InvalidInsulationConfigError(
                    `unknown key "${innerKey}" in imports['${dirPath}']`,
                    configFilePath,
                    loadedConfig,
                );
            }
            if (!Array.isArray(importGroup[innerKey])) {
                throw new InvalidInsulationConfigError(
                    `array required for "imports.${dirPath}.${innerKey}"`,
                    configFilePath,
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

    if (finalizedConfig.silent) {
        finalizedConfig.silent = true;
    } else {
        finalizedConfig.silent = false;
    }

    return fixPaths(finalizedConfig as InsulationConfig);
}
