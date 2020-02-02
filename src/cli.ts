#!/usr/bin/env node

import * as minimist from 'minimist';
import {checkInsulation} from './index';
import {join} from 'path';

const DEFAULT_INSULATION_FILE = '.insulation.json';

async function run() {
    const args = minimist(process.argv.slice(2));

    const dirToCheck = (typeof args.d === 'string' && args.d) || './';
    const insulationFilePath = (typeof args.f === 'string' && args.f) || join(dirToCheck, DEFAULT_INSULATION_FILE);
    const loud = !args.s;
    const compile = !!args.c;

    const {projects, illegalImports} = await checkInsulation(dirToCheck, insulationFilePath, compile);

    if (loud) {
        console.log('Projects checked:');
        projects.map(project => project.name).forEach(name => console.log(`    ${name}`));
    }

    if (Object.keys(illegalImports).length > 0) {
        if (loud) {
            Object.keys(illegalImports).forEach(projectName => {
                console.log(`${projectName} incorrectly imports:`);
                illegalImports[projectName].forEach(illegalImport => console.log(`    ${illegalImport}`));
            });
        }
        if (loud) {
            console.error('\nInsulation failed.\n');
            throw new Error('Insulation failed.');
        } else {
            throw new Error('');
        }
    } else {
        if (loud) {
            console.log('Insulation passed.');
        }
        return;
    }
}

run()
    .then(() => process.exit(0))
    .catch(error => {
        if (error.message) {
            console.error(error);
        }
        process.exit(1);
    });
