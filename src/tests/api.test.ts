import {join} from 'path';
import {testGroup} from 'test-vir';
import {insulate, InsulationConfig, InvalidDependencyReason} from '..';
import {testImportsDir} from './repo-paths';

const tests: {
    description: string;
    config: Partial<InsulationConfig>;
    expectedInvalidImports: InvalidDependencyReason[];
    forceOnly?: boolean;
    exclude?: boolean;
}[] = [
    {
        description: 'no imports defined',
        config: {checkDirectory: testImportsDir, imports: {}},
        expectedInvalidImports: [],
    },
    {description: 'does nothing', config: {}, expectedInvalidImports: []},
    {
        description: 'all imports allowed',
        config: {
            checkDirectory: testImportsDir,
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
            checkDirectory: testImportsDir,
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
            checkDirectory: testImportsDir,
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
            checkDirectory: testImportsDir,
            imports: {
                a: {block: ['b']},
            },
        },
        expectedInvalidImports: [InvalidDependencyReason.Blocked],
    },
    {
        description: "can allow without specifying the allowed path's imports",
        config: {
            checkDirectory: testImportsDir,
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
            checkDirectory: testImportsDir,
            imports: {
                a: {block: ['a']},
            },
        },
        expectedInvalidImports: [InvalidDependencyReason.Blocked, InvalidDependencyReason.Blocked],
    },
    {
        description: 'can block and allow the same path',
        config: {
            checkDirectory: testImportsDir,
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
            checkDirectory: join(testImportsDir, 'a'),
        },
        expectedInvalidImports: [],
    },
    {
        description: "directories with similar names don't clash",
        config: {
            checkDirectory: testImportsDir,
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

testGroup((runTest) => {
    tests.map(async (test) => {
        runTest({
            description: test.description,
            expect: test.expectedInvalidImports,
            forceOnly: test.forceOnly,
            exclude: test.exclude,
            test: async () => {
                const invalidImports = await insulate(test.config);

                return invalidImports.map((invalidImport) => invalidImport.reason);
            },
        });
    });
});
