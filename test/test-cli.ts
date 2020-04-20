import {exec} from 'child_process';
import {handleTests, TestResult, testImportsDir} from './test';
import {join} from 'path';

type CliResult = {
    stdout: string;
    stderr: string;
    error: Error | null;
};

type CliTest = {
    name: string;
    configPath: string;
    expectedInError?: string;
    extraArgs?: string;
};

const tests: CliTest[] = [
    {name: 'use default config', configPath: '', expectedInError: 'NotInsulatedError: Imports not insulated'},
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

async function testCli(configPath: String): Promise<CliResult> {
    return new Promise<CliResult>(resolve => {
        exec(`node -r ts-node/register ./src/cli.ts -f ${configPath}`, (error, stdout, stderr) => {
            resolve({stdout, stderr, error});
        });
    });
}

function handleCliTestResult(test: CliTest, result: CliResult) {
    const returnValue = {
        output: result,
        passed: false,
    };

    if (test.expectedInError && result.stderr.includes(test.expectedInError)) {
        returnValue.passed = true;
    } else if (!test.expectedInError && !result.error) {
        returnValue.passed = true;
    }

    return returnValue;
}

async function runTest(test: CliTest): Promise<{output: CliResult; passed: boolean}> {
    const result = await testCli(test.configPath);
    return handleCliTestResult(test, result);
}

async function runAllCliTests() {
    const results = await Promise.all(tests.map(async test => runTest(test)));

    const allResults: TestResult[] = results.map((result, index) => ({
        testName: tests[index].name,
        passed: result.passed,
        failureDetail: result.output.stderr,
    }));

    const silentTest = await testCli(join(testImportsDir, '.insulation-silent.json'));
    const silentTestPassed = !silentTest.stderr && !silentTest.stdout;
    allResults.push({
        testName: 'silent property prevents output',
        passed: silentTestPassed,
        failureDetail: `stderr:\n\t${silentTest.stderr}\nstdout:\n\t${silentTest.stdout}`,
    });

    return allResults;
}

async function main() {
    const allResults = await runAllCliTests();
    handleTests(allResults, 'cli');
}

main().catch(error => console.error(error));
