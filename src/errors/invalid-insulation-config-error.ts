import {InsulationConfig} from '../config';

export class InvalidInsulationConfigError extends Error {
    public name = 'InvalidInsulationConfigError';
    constructor(message: string, config?: Partial<InsulationConfig>) {
        super(
            `Invalid Insulation config: ${message}${
                config && !config.silent ? `\n${JSON.stringify(config, null, 4)}` : ''
            }`,
        );
    }
}
