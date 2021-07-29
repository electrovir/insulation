import {join} from 'path';
import {testGroup} from 'test-vir';
import {runBashCommand} from './bash-scripting';
import {testImportsDir} from './repo-paths';

type CliTest = {
    name: string;
    configPath: string;
    expectedInError?: string;
    forceOnly?: boolean;
};

const tests: CliTest[] = [
    {
        name: 'use default config',
        configPath: '',
        expectedInError: 'NotInsulatedError: Imports not insulated',
    },
    {
        name: 'invalid configuration',
        configPath: join(testImportsDir, '.insulation-invalid.json'),
        expectedInError: 'InvalidInsulationConfigError: ',
    },
    {
        name: 'no errors',
        configPath: join(testImportsDir, '.insulation-allow.json'),
    },
    {
        name: 'change check directory',
        configPath: join(testImportsDir, '.insulation-check-dir.json'),
    },
];

testGroup((runTest) => {
    tests.forEach((test) => {
        runTest({
            description: test.name,
            expect: true,
            forceOnly: test.forceOnly,
            test: async () => {
                const result = await runBashCommand(
                    `node ./dist/cli.js -f ${test.configPath.replace(/\\/g, '\\\\\\\\')}`,
                );
                let passed = false;

                if (test.expectedInError && result.stderr.includes(test.expectedInError)) {
                    passed = true;
                } else if (!test.expectedInError && !result.error) {
                    passed = true;
                }

                if (!passed) {
                    console.log(result);
                }
                return passed;
            },
        });
    });
});
