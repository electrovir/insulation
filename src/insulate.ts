import {IModule} from 'dependency-cruiser';
import {existsSync, lstatSync} from 'fs';
import {join, relative} from 'path';
import {finalizeInsulationConfig, InsulationConfig} from './config';
import {
    getDependencyList,
    InvalidDependency,
    InvalidDependencyReason,
    isChildDir,
} from './dependencies';
import {InvalidInsulationConfigError} from './errors/invalid-insulation-config-error';

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
                    reason: InvalidDependencyReason.NotAllowed,
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
                    reason: InvalidDependencyReason.Blocked,
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
