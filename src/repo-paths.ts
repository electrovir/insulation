import {dirname, join} from 'path';

/**
 * Path to the repo's root. Does not use the package name because the source code could
 * theoretically be cloned into any folder. "src" is used for the ts source code files (so they CAN
 * be run directly without transpiling it into JS) and "dist" is used for the transpiled JS output directory.
 */
export const repoRootDir = dirname(__dirname);
export const testFilesDir = join(repoRootDir, 'test-files');
