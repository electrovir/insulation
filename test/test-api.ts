import {insulate, InvalidDependencyReason, InsulationConfig} from '../src';
import {join} from 'path';
import {TestResult, handleTests} from './test';

const tests: {name: string; config: InsulationConfig; expectedFailures: InvalidDependencyReason[]}[] = [
    {name: 'no imports defined', config: {imports: {}}, expectedFailures: []},
    {name: 'all imports allowed', config: {imports: {a: {allow: ['b']}, b: {allow: ['a']}}}, expectedFailures: []},
    {
        name: 'empty allowed imports',
        config: {imports: {a: {allow: ['b']}, b: {allow: []}}},
        expectedFailures: [InvalidDependencyReason.NOT_ALLOWED],
    },
    {
        name: 'blocked imports',
        config: {imports: {a: {allow: ['b']}, b: {block: ['a']}}},
        expectedFailures: [InvalidDependencyReason.BLOCKED],
    },
    {
        name: "can block without specifying the blocked path's imports",
        config: {imports: {a: {block: ['b']}}},
        expectedFailures: [InvalidDependencyReason.BLOCKED],
    },
    {
        name: "can allow without specifying the allowed path's imports",
        config: {imports: {a: {allow: ['b']}}},
        expectedFailures: [],
    },
    {
        name: 'can block imports from self',
        config: {imports: {a: {block: ['a']}}},
        expectedFailures: [InvalidDependencyReason.BLOCKED],
    },
    {
        name: 'can block and allow the same path',
        config: {imports: {a: {allow: ['b'], block: ['b']}}},
        expectedFailures: [InvalidDependencyReason.BLOCKED],
    },
];

const testImportsDir = join(__dirname, 'test-imports');

async function runApiTests(): Promise<TestResult[]> {
    const results = await Promise.all(
        tests.map(async test => {
            const result = await insulate(testImportsDir, test.config);
            const passed =
                result.length === test.expectedFailures.length &&
                !result.some((result, index) => result.reason !== test.expectedFailures[index]);
            return {
                testName: test.name,
                passed,
                failureDetail: JSON.stringify(result, null, 4),
            };
        }),
    );

    // test reaction to config with path that doesn't exist
    const pathNoExistConfig = {imports: {q: {block: ['a']}}};
    const pathNoExistTestName = "Config path doesn't exist";
    try {
        await insulate(testImportsDir, pathNoExistConfig);
        results.push({testName: pathNoExistTestName, passed: false, failureDetail: "api call didn't throw an error"});
    } catch (error) {
        results.push({testName: pathNoExistTestName, passed: true, failureDetail: "api call didn't throw an error"});
    }

    results.push();

    return results;
}

async function main() {
    handleTests(await runApiTests(), 'api');
}

if (!module.parent) {
    main().catch(error => {
        console.error(error);
        process.exit(1);
    });
}
