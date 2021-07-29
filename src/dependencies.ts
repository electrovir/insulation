import {cruise, IDependency as Dependency, IModule} from 'dependency-cruiser';
import {isAbsolute, join, relative} from 'path';
import {InsulationConfig} from './config';
import {DependencyReadError} from './errors/dependency-read-error';
export {IDependency as Dependency} from 'dependency-cruiser';

export type InvalidDependency = {
    dependency: Dependency;
    reason: InvalidDependencyReason;
    importedBy: string;
};

/** An enumeration of the possible reasons why a dependency could be considered invalid. */
export enum InvalidDependencyReason {
    /** This dependency was explicitly blocked by the insulation config */
    Blocked = 'blocked',
    /** This dependency was not in an un-empty allowed import list of the insulation config */
    NotAllowed = 'not-allowed',
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

export function isChildDir(child: string, parent: string): boolean {
    const relativePath = relative(parent, child);
    return !!relativePath && !relativePath.startsWith('..') && !isAbsolute(relativePath);
}
