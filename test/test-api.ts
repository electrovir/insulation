import {insulate, InvalidDependencyReason, InsulationConfig} from '../src';
import {join} from 'path';
import {TestResult, handleTests, testImportsDir} from './test';

const tests: {name: string; config: Partial<InsulationConfig>; expectedInvalidImports: InvalidDependencyReason[]}[] = [
    {
        name: 'no imports defined',
        config: {checkDirectory: testImportsDir, imports: {}},
        expectedInvalidImports: [],
    },
    {name: 'does nothing', config: {}, expectedInvalidImports: []},
    {
        name: 'all imports allowed',
        config: {checkDirectory: testImportsDir, imports: {a: {allow: ['b']}, b: {allow: ['a']}}},
        expectedInvalidImports: [],
    },
    {
        name: 'empty allowed imports',
        config: {checkDirectory: testImportsDir, imports: {a: {allow: ['b']}, b: {allow: []}}},
        expectedInvalidImports: [InvalidDependencyReason.NOT_ALLOWED],
    },
    {
        name: 'blocked imports',
        config: {checkDirectory: testImportsDir, imports: {a: {allow: ['b']}, b: {block: ['a']}}},
        expectedInvalidImports: [InvalidDependencyReason.BLOCKED],
    },
    {
        name: "can block without specifying the blocked path's imports",
        config: {checkDirectory: testImportsDir, imports: {a: {block: ['b']}}},
        expectedInvalidImports: [InvalidDependencyReason.BLOCKED],
    },
    {
        name: "can allow without specifying the allowed path's imports",
        config: {checkDirectory: testImportsDir, imports: {a: {allow: ['b']}}},
        expectedInvalidImports: [],
    },
    {
        name: 'can block imports from self',
        config: {checkDirectory: testImportsDir, imports: {a: {block: ['a']}}},
        expectedInvalidImports: [InvalidDependencyReason.BLOCKED, InvalidDependencyReason.BLOCKED],
    },
    {
        name: 'can block and allow the same path',
        config: {checkDirectory: testImportsDir, imports: {a: {allow: ['b'], block: ['b']}}},
        expectedInvalidImports: [InvalidDependencyReason.BLOCKED],
    },
    {
        name: 'config check directory overrides input check directory',
        config: {
            imports: {'sub-a-a': {allow: []}, 'sub-a-b': {allow: ['sub-a-a']}},
            checkDirectory: join(testImportsDir, 'a'),
        },
        expectedInvalidImports: [],
    },
    {
        name: "directories with similar names don't clash",
        config: {
            checkDirectory: testImportsDir,
            imports: {a: {allow: []}, aab: {allow: ['b']}, b: {allow: ['a']}},
        },
        expectedInvalidImports: [InvalidDependencyReason.NOT_ALLOWED],
    },
];

async function runApiTests(): Promise<TestResult[]> {
    const results = await Promise.all(
        tests.map(async test => {
            const result = await insulate(test.config);
            const passed =
                result.length === test.expectedInvalidImports.length &&
                !result.some((result, index) => result.reason !== test.expectedInvalidImports[index]);
            return {
                testName: test.name,
                passed,
                failureDetail: JSON.stringify(result, null, 4),
            };
        }),
    );

    // test reaction to config with path that doesn't exist
    const pathNoExistConfig = {silent: true, checkDirectory: testImportsDir, imports: {q: {block: ['a']}}};
    const pathNoExistTestName = "config path doesn't exist";
    try {
        await insulate(pathNoExistConfig);
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
