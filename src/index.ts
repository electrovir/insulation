import {
    cruise,
    ICruiseOptions as Options,
    IDependency as Dependency,
    IModule,
} from 'dependency-cruiser';
import {existsSync, lstatSync, readFileSync} from 'fs';
import {isAbsolute, join, relative} from 'path';
import {getObjectTypedKeys} from './object';
export {ICruiseOptions as Options, IDependency as Dependency} from 'dependency-cruiser';

export class InvalidInsulationConfigError extends Error {
    public name = 'InvalidInsulationConfigError';
    constructor(message: string, config?: Partial<InsulationConfig>) {
        super(
            `Invalid Insulation config: ${message}${
                config && !config.silent ? `\n${JSON.stringify(config, null, 4)}` : ''
            }`,
        );
    }
}

export class DependencyReadError extends Error {
    public name = 'DependencyReadError';
}

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

export type InvalidDependency = {
    dependency: Dependency;
    reason: InvalidDependencyReason;
    importedBy: string;
};

/** An enumeration of the possible reasons why a dependency could be considered invalid. */
export const enum InvalidDependencyReason {
    /** This dependency was explicitly blocked by the insulation config */
    BLOCKED = 'blocked',
    /** This dependency was not in an un-empty allowed import list of the insulation config */
    NOT_ALLOWED = 'not-allowed',
}

const ALLOWED_IMPORT_KEYS = ['allow', 'block'];
const DEFAULT_EXCLUDE = ['node_modules', 'bower_components'];

function finalizeInsulationConfig(loadedConfig: Partial<InsulationConfig>): InsulationConfig {
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
            if (!ALLOWED_IMPORT_KEYS.includes(innerKey)) {
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

    finalizedConfig.options.exclude = `${DEFAULT_EXCLUDE.join('|')}|${
        finalizedConfig.options.exclude
    }`;

    if (!finalizedConfig.silent == undefined) {
        finalizedConfig.silent = false;
    }

    return finalizedConfig as InsulationConfig;
}

export function readInsulationConfigFile(filePath: string): InsulationConfig {
    const json = JSON.parse(readFileSync(filePath).toString());
    return finalizeInsulationConfig(json);
}

export function getDependencyList(config: Required<InsulationConfig>): IModule[] {
    const cruiseOutput = cruise(
        Object.keys(config.imports).map((importPath) => join(config.checkDirectory, importPath)),
        config.options,
    ).output;

    if (typeof cruiseOutput === 'string') {
        throw new DependencyReadError(`Unable to read dependencies.`);
    }

    return cruiseOutput.modules;
}

function isChildDir(child: string, parent: string): boolean {
    const relativePath = relative(parent, child);
    return !!relativePath && !relativePath.startsWith('..') && !isAbsolute(relativePath);
}

export async function insulate(
    inputConfig: Partial<InsulationConfig>,
    includeOriginalModuleList: true,
): Promise<{invalidDeps: InvalidDependency[]; modules: IModule[]}>;
export async function insulate(
    inputConfig: Partial<InsulationConfig>,
    includeOriginalModuleList?: false | undefined,
): Promise<InvalidDependency[]>;
export async function insulate(
    inputConfig: Partial<InsulationConfig>,
    includeOriginalModuleList?: boolean | undefined,
): Promise<InvalidDependency[] | {invalidDeps: InvalidDependency[]; modules: IModule[]}> {
    const config = finalizeInsulationConfig(inputConfig);

    const relativePath = relative(process.cwd(), config.checkDirectory);

    function makeRelative(input: string) {
        return join(relativePath, input);
    }

    const insulationPaths = Object.keys(config.imports);
    if (!insulationPaths.length) {
        // no need to do anything
        if (includeOriginalModuleList) {
            return {
                invalidDeps: [],
                modules: [],
            };
        } else {
            return [];
        }
    }

    Object.keys(config.imports)
        .map((dir) => makeRelative(dir))
        .forEach((dir) => {
            if (!existsSync(dir)) {
                throw new InvalidInsulationConfigError(
                    `"${dir}" from Insulation config does not exist`,
                    inputConfig,
                );
            }
            if (!lstatSync(dir).isDirectory()) {
                throw new InvalidInsulationConfigError(
                    `"${dir}" from Insulation config is not a directory`,
                    inputConfig,
                );
            }
        });

    const modules = getDependencyList(config);
    const invalidModules = modules.reduce((invalidModules: InvalidDependency[], currentModule) => {
        const insulationPath = insulationPaths.find((path) =>
            isChildDir(currentModule.source, makeRelative(path)),
        );
        if (!insulationPath) {
            // this module is not part of the config, ignore it
            return invalidModules;
        }
        const pathConfig = config.imports[insulationPath];

        // check allowed paths
        if (pathConfig.allow) {
            const notAllowedImports = currentModule.dependencies
                .filter((dependency) => {
                    // dependency is in the current module's dir, this is always allowed
                    if (isChildDir(dependency.resolved, makeRelative(insulationPath))) {
                        return false;
                    }

                    // allow imports from core modules
                    if (dependency.coreModule) {
                        return false;
                    }

                    const foundAllowedImport = pathConfig.allow?.find((allowedPath) => {
                        return isChildDir(dependency.resolved, makeRelative(allowedPath));
                    });

                    return !foundAllowedImport;
                })
                .map((dependency) => ({
                    dependency,
                    reason: InvalidDependencyReason.NOT_ALLOWED,
                    importedBy: currentModule.source,
                }));
            invalidModules.push(...notAllowedImports);
        }

        // check blocked paths
        if (pathConfig.block) {
            const blockedImports = currentModule.dependencies
                .filter((dependency) => {
                    // allow imports from core modules
                    if (dependency.coreModule) {
                        return false;
                    }

                    return pathConfig.block?.find((blockedPath) => {
                        return isChildDir(dependency.resolved, makeRelative(blockedPath));
                    });
                })
                .map((dependency) => ({
                    dependency,
                    reason: InvalidDependencyReason.BLOCKED,
                    importedBy: currentModule.source,
                }));
            invalidModules.push(...blockedImports);
        }
        return invalidModules;
    }, []);

    if (includeOriginalModuleList) {
        return {
            invalidDeps: invalidModules,
            modules,
        };
    } else {
        return invalidModules;
    }
}
