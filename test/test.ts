import {checkInsulation} from '../src';
import {join} from 'path';

const tests = [
    {
        dir: 'test-dir-correct',
        expectedIllegals: 0,
    },
    {
        dir: 'test-dir-error',
        expectedIllegals: 1,
    },
];

async function run() {
    await Promise.all(
        tests.map(async test => {
            const {projects, illegalImports} = await checkInsulation(
                join('test', test.dir),
                join('test', test.dir, '.insulation.json'),
                true,
            );
            if (Object.keys(illegalImports).length !== test.expectedIllegals) {
                throw new Error(
                    `"${test.dir} has ${
                        Object.keys(illegalImports).length
                    } projects with illegal imports but expected ${test.expectedIllegals}`,
                );
            }
        }),
    );
}

run()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error.message);
        process.exit(1);
    });
