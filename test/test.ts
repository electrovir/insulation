import * as styles from 'ansi-styles';
import {join} from 'path';

export const testImportsDir = join(__dirname, 'test-imports');

export type TestResult = {
    passed: boolean;
    testName: string;
    failureDetail: string;
};

function formatTestResults(results: TestResult[]): string {
    const resultString =
        '\t' +
        results
            .map((result) => {
                const output =
                    `${styles.bold.open}` +
                    (result.passed ? `${styles.green.open}Passed` : `${styles.red.open}Failed`) +
                    `${styles.reset.close}: ${result.testName}${
                        result.passed
                            ? ''
                            : '\n\t\t' + result.failureDetail.split('\n').join('\n\t\t')
                    }`;
                return output;
            })
            .join('\n\t');

    return resultString;
}

export function handleTests(testResults: TestResult[], testType: string) {
    const resultString = formatTestResults(testResults);

    const testTypeString = `${styles.inverse.open}${styles.bold.open}${testType}${styles.inverse.close}${styles.bold.close}`;

    if (testResults.some((test) => !test.passed)) {
        console.error(resultString);
        console.error(
            `${styles.red.open}Some ${testTypeString} tests failed${styles.reset.close}\n`,
        );
        process.exit(1);
    } else {
        console.log(resultString);
        console.log(
            `${styles.green.open}All ${testTypeString} tests passed${styles.reset.close}\n`,
        );
        process.exit(0);
    }
}
