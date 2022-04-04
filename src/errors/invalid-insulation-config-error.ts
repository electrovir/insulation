import {InsulationConfig} from '../config';

export class InvalidInsulationConfigError extends Error {
    public override name = 'InvalidInsulationConfigError';
    constructor(message: string, filePath?: string, config?: Partial<InsulationConfig>) {
        super(
            `Invalid Insulation config${filePath ? ` at "${filePath}"` : ''}: ${message}${
                config && !config.silent ? `\n${JSON.stringify(config, null, 4)}` : ''
            }`,
        );
    }
}
