import {lstatSync, existsSync, readFileSync} from 'fs';
import {join, relative, isAbsolute} from 'path';
import {cruise, IModule, IDependency as Dependency} from 'dependency-cruiser';
import {getObjectTypedKeys} from './object';
export {IDependency as Dependency} from 'dependency-cruiser';

export class InvalidInsulationConfigError extends Error {
    public name = 'InvalidInsulationConfigError';
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
    exclude?: string[];
    checkDirectory?: string;
};

export type InvalidDependency = {
    dependency: Dependency;
    reason: InvalidDependencyReason;
    importedBy: string;
};

/**
 * An enumeration of the possible reasons why a dependency could be considered invalid.
 */
export const enum InvalidDependencyReason {
    /**
     * This dependency was explicitly blocked by the insulation config
     */
    BLOCKED = 'blocked',
    /**
     * This dependency was not in an un-empty allowed import list of the insulation config
     */
    NOT_ALLOWED = 'not-allowed',
}

const ALLOWED_IMPORT_KEYS = ['allow', 'block'];
const DEFAULT_EXCLUDES = ['node_modules', 'bower_components'];

function invalidConfigError(details: string) {
    throw new InvalidInsulationConfigError(`Invalid Insulation config: ${details}`);
}

function validateInsulationConfig(loadedConfig: InsulationConfig): asserts loadedConfig is InsulationConfig {
    if (!loadedConfig.hasOwnProperty('imports')) {
        invalidConfigError(`missing "imports" property`);
    }

    getObjectTypedKeys(loadedConfig.imports).forEach(dirPath => {
        const innerConfig = loadedConfig.imports[dirPath];
        const innerKeys = getObjectTypedKeys(innerConfig);

        innerKeys.forEach(innerKey => {
            if (!ALLOWED_IMPORT_KEYS.includes(innerKey)) {
                invalidConfigError(`unknown key "${innerKey}"`);
            }
            if (!Array.isArray(loadedConfig.imports[dirPath][innerKey])) {
                invalidConfigError(`array required for "imports.${dirPath}.${innerKey}"`);
            }
        });
    });

    if (loadedConfig.hasOwnProperty('excludes')) {
        if (!Array.isArray(loadedConfig.exclude)) {
            invalidConfigError(`array required for "excludes"`);
        }
    }
}

export function readInsulationConfigFile(filePath: string): InsulationConfig {
    const json = JSON.parse(readFileSync(filePath).toString());
    validateInsulationConfig(json);
    return json;
}

export function getDependencyList(parentDirPath: string, insulationConfig: InsulationConfig): IModule[] {
    const exclude = DEFAULT_EXCLUDES.concat(insulationConfig.exclude || []).join('|');

    const cruiseOutput = cruise(
        Object.keys(insulationConfig.imports).map(importPath => join(parentDirPath, importPath)),
        {
            exclude,
        },
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
    insulationConfig: InsulationConfig,
    checkDirPath: string,
    includeOriginalModuleList: true,
): Promise<{invalidDeps: InvalidDependency[]; modules: IModule[]}>;
export async function insulate(
    insulationConfig: InsulationConfig,
    checkDirPath: string,
    includeOriginalModuleList?: false | undefined,
): Promise<InvalidDependency[]>;
export async function insulate(
    insulationConfig: InsulationConfig,
    checkDirPath: string = './',
    includeOriginalModuleList?: boolean | undefined,
): Promise<InvalidDependency[] | {invalidDeps: InvalidDependency[]; modules: IModule[]}> {
    validateInsulationConfig(insulationConfig);

    if (insulationConfig.checkDirectory) {
        checkDirPath = insulationConfig.checkDirectory;
    }

    const relativePath = relative(process.cwd(), checkDirPath);

    function makeRelative(input: string) {
        return join(relativePath, input);
    }

    const insulationPaths = Object.keys(insulationConfig.imports);
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

    Object.keys(insulationConfig.imports)
        .map(dir => join(checkDirPath, dir))
        .forEach(dir => {
            if (!existsSync(dir)) {
                invalidConfigError(`"${dir}" from Insulation config does not exist`);
            }
            if (!lstatSync(dir).isDirectory()) {
                invalidConfigError(`"${dir}" from Insulation config is not a directory`);
            }
        });

    const modules = getDependencyList(checkDirPath, insulationConfig);
    const invalidModules = modules.reduce((invalidModules: InvalidDependency[], currentModule) => {
        const insulationPath = insulationPaths.find(path => isChildDir(currentModule.source, makeRelative(path)));
        if (!insulationPath) {
            // this module is not part of the config, ignore it
            return invalidModules;
        }
        const pathConfig = insulationConfig.imports[insulationPath];

        // check allowed paths
        if (pathConfig.allow) {
            const notAllowedImports = currentModule.dependencies
                .filter(dependency => {
                    // dependency is in the current module's dir, this is always allowed
                    if (isChildDir(dependency.resolved, makeRelative(insulationPath))) {
                        return false;
                    }

                    // allow imports from core modules
                    if (dependency.coreModule) {
                        return false;
                    }

                    const foundAllowedImport = pathConfig.allow?.find(allowedPath => {
                        return isChildDir(dependency.resolved, makeRelative(allowedPath));
                    });

                    return !foundAllowedImport;
                })
                .map(dependency => ({
                    dependency,
                    reason: InvalidDependencyReason.NOT_ALLOWED,
                    importedBy: currentModule.source,
                }));
            invalidModules.push(...notAllowedImports);
        }

        // check blocked paths
        if (pathConfig.block) {
            const blockedImports = currentModule.dependencies
                .filter(dependency => {
                    // allow imports from core modules
                    if (dependency.coreModule) {
                        return false;
                    }

                    return pathConfig.block?.find(blockedPath => {
                        return isChildDir(dependency.resolved, makeRelative(blockedPath));
                    });
                })
                .map(dependency => ({
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
