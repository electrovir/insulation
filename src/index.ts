import {readdir, lstatSync, existsSync, emptyDir, readFile} from 'fs-extra';
import {join, basename} from 'path';
import {exec} from 'child_process';

type TsProject = {
    path: string;
    name: string;
    imports: string[];
};

async function compileProject(projectPath: string) {
    return new Promise<string>((resolve, reject) => {
        exec(`tsc -p "${projectPath}"`, (error, stdout) => {
            if (error) {
                reject(error);
            }

            resolve(stdout);
        });
    });
}

async function getProjects(dir: string, compile: boolean): Promise<TsProject[]> {
    let commonRootDir: undefined | string;
    return await Promise.all(
        (await readdir(dir))
            .map(name => join(dir, name))
            .filter(path => lstatSync(path).isDirectory() && existsSync(join(path, 'tsconfig.json')))
            .map(async path => {
                const tsConfigPath = join(path, 'tsconfig.json');

                const tsConfig: {compilerOptions?: {outDir?: string; rootDir?: string}} = JSON.parse(
                    (await readFile(tsConfigPath)).toString(),
                );

                if (!tsConfig.compilerOptions || !tsConfig.compilerOptions.outDir) {
                    throw new Error(
                        `${tsConfigPath} is missing "compilerOptions.outDir". See "Project Requirements" in the README for details.`,
                    );
                }
                if (!tsConfig.compilerOptions.rootDir) {
                    throw new Error(
                        `${tsConfigPath} is missing "compilerOptions.rootDir" option. See "Project Requirements" in the README for details.`,
                    );
                }

                if (commonRootDir === undefined) {
                    commonRootDir = tsConfig.compilerOptions.rootDir;
                } else if (commonRootDir !== tsConfig.compilerOptions.rootDir) {
                    throw new Error(
                        `Projects do not have the same rootDir. "${commonRootDir}" was expected but ${tsConfigPath} has "${tsConfig.compilerOptions.rootDir}". See "Project Requirements" in the README for details.`,
                    );
                }

                const outDirPath = join(path, tsConfig.compilerOptions.outDir);

                if (compile) {
                    await emptyDir(outDirPath);
                    await compileProject(path);
                } else if (!existsSync(outDirPath)) {
                    throw new Error(`outDir "${outDirPath}" does not exist. Did you forget to compile (tsc) first?`);
                }

                const currentProjectName = basename(path);

                let selfFound = false;

                const imports = (await readdir(outDirPath)).filter(name => {
                    if (lstatSync(join(outDirPath, name)).isDirectory()) {
                        if (name === currentProjectName) {
                            selfFound = true;
                            return false;
                        }

                        return true;
                    }
                    return false;
                });

                if (!selfFound) {
                    throw new Error(
                        `outDir for project "${currentProjectName}" ("${outDirPath}") does not contain the project itself! Did you forget to compile TS?`,
                    );
                }

                return {
                    name: currentProjectName,
                    path,
                    imports,
                };
            }),
    );
}

async function getInsulation(filePath: string) {
    return JSON.parse((await readFile(filePath)).toString());
}

export async function checkInsulation(dir: string, insulationFilePath: string, compileProjects: boolean) {
    const projects = await getProjects(dir, compileProjects);

    if (!projects.length) {
        throw new Error(`No TS projects were found in "${dir}"`);
    }

    const insulation = await getInsulation(insulationFilePath);

    const illegalImports = projects.reduce((accum: {[key: string]: string[]}, project) => {
        const allowedImports = insulation[project.name] || [];

        const illegalImports = project.imports.filter(importName => !allowedImports.includes(importName));

        if (illegalImports.length) {
            accum[project.path] = illegalImports;
        }

        return accum;
    }, {});

    return {
        projects,
        illegalImports,
    };
}
