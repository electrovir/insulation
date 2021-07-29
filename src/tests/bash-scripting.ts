import {exec, ExecException} from 'child_process';

export type BashOutput = {error: ExecException | null; stderr: string; stdout: string};

export async function runBashCommand(command: string): Promise<BashOutput> {
    return new Promise<BashOutput>((resolve) => {
        exec(command, {shell: 'bash'}, (error, stdout, stderr) => {
            const output: BashOutput = {error, stdout, stderr};
            return resolve(output);
        });
    });
}
