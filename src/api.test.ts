import {join} from 'path';
import {insulate, InsulationConfig, InvalidDependencyReason} from '.';
import {testFilesDir} from './repo-paths';

const tests: {
    description: string;
    config: Partial<InsulationConfig>;
    expectedInvalidImports: InvalidDependencyReason[];
    forceOnly?: boolean;
    exclude?: boolean;
}[] = [
    {
        description: 'no imports defined',
        config: {checkDirectory: testFilesDir, imports: {}},
        expectedInvalidImports: [],
    },
    {description: 'does nothing', config: {}, expectedInvalidImports: []},
    {
        description: 'all imports allowed',
        config: {
            checkDirectory: testFilesDir,
            imports: {
                a: {
                    allow: ['b'],
                },
                b: {
                    allow: ['a'],
                },
            },
        },
        expectedInvalidImports: [],
    },
    {
        description: 'empty allowed imports',
        config: {
            checkDirectory: testFilesDir,
            imports: {
                a: {
                    allow: ['b'],
                },
                b: {
                    allow: [],
                },
            },
        },
        expectedInvalidImports: [InvalidDependencyReason.NotAllowed],
    },
    {
        description: 'blocked imports',
        config: {
            checkDirectory: testFilesDir,
            imports: {
                a: {
                    allow: ['b'],
                },
                b: {block: ['a']},
            },
        },
        expectedInvalidImports: [InvalidDependencyReason.Blocked],
    },
    {
        description: "can block without specifying the blocked path's imports",
        config: {
            checkDirectory: testFilesDir,
            imports: {
                a: {block: ['b']},
            },
        },
        expectedInvalidImports: [InvalidDependencyReason.Blocked],
    },
    {
        description: "can allow without specifying the allowed path's imports",
        config: {
            checkDirectory: testFilesDir,
            imports: {
                a: {
                    allow: ['b'],
                },
            },
        },
        expectedInvalidImports: [],
    },
    {
        description: 'can block imports from self',
        config: {
            checkDirectory: testFilesDir,
            imports: {
                a: {block: ['a']},
            },
        },
        expectedInvalidImports: [
            InvalidDependencyReason.Blocked,
            InvalidDependencyReason.Blocked,
        ],
    },
    {
        description: 'can block and allow the same path',
        config: {
            checkDirectory: testFilesDir,
            imports: {
                a: {
                    allow: ['b'],
                    block: ['b'],
                },
            },
        },
        expectedInvalidImports: [InvalidDependencyReason.Blocked],
    },
    {
        description: 'config check directory overrides input check directory',
        config: {
            imports: {
                'sub-a-a': {
                    allow: [],
                },
                'sub-a-b': {
                    allow: ['sub-a-a'],
                },
            },
            checkDirectory: join(testFilesDir, 'a'),
        },
        expectedInvalidImports: [],
    },
    {
        description: "directories with similar names don't clash",
        config: {
            checkDirectory: testFilesDir,
            imports: {
                a: {
                    allow: [],
                },
                aab: {
                    allow: ['b'],
                },
                b: {
                    allow: ['a'],
                },
            },
        },
        expectedInvalidImports: [InvalidDependencyReason.NotAllowed],
    },
];

describe(__filename, () => {
    let forcedTests = false;
    let excludedTests = false;

    tests.map(async (test) => {
        const testFunction = test.forceOnly ? fit : test.exclude ? xit : it;

        if (test.forceOnly) {
            forcedTests = true;
        } else if (test.exclude) {
            excludedTests = true;
        }

        testFunction(test.description, async () => {
            const invalidImports = await insulate(test.config, undefined);

            const invalidImportReasons = invalidImports.map(
                (invalidImport) => invalidImport.reason,
            );

            expect(invalidImportReasons).toEqual(test.expectedInvalidImports);
        });
    });

    const noForcedTestsFunction = forcedTests ? fit : it;

    noForcedTestsFunction('should have no forced tests', () => {
        expect(forcedTests).toBeFalsy();
    });
    noForcedTestsFunction('should not have any excluded tests', () => {
        expect(excludedTests).toBeFalsy();
    });
});
