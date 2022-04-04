import {interpolationSafeWindowsPath, runShellCommand} from 'augment-vir/dist/node-only';
import {join} from 'path';
import {testFilesDir} from './repo-paths';

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
        configPath: join(testFilesDir, '.insulation-invalid.json'),
        expectedInError: 'InvalidInsulationConfigError: ',
    },
    {
        name: 'no errors',
        configPath: join(testFilesDir, '.insulation-allow.json'),
    },
    {
        name: 'change check directory',
        configPath: join(testFilesDir, '.insulation-check-dir.json'),
    },
];

describe(__filename, () => {
    let forcedTests = false;

    tests.forEach((test) => {
        const testFunction = test.forceOnly ? fit : it;

        if (test.forceOnly) {
            forcedTests = true;
        }

        testFunction(test.name, async () => {
            const result = await runShellCommand(
                `node ./dist/cli.js -f ${interpolationSafeWindowsPath(test.configPath)}`,
            );

            try {
                if (test.expectedInError) {
                    expect(result.stderr).toMatch(test.expectedInError);
                } else {
                    expect(result.error).toBeUndefined();
                }
            } catch (error) {
                console.error(result);
                throw error;
            }
        });
    });

    const noForcedTestsFunction = forcedTests ? fit : it;

    noForcedTestsFunction('should have no forced tests', () => {
        expect(forcedTests).toBeFalsy();
    });
});
