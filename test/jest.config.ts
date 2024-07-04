import { Config } from '@jest/types';

import nodefs from 'fs';
import nodepath from 'path';

const packagejson = JSON.parse(nodefs.readFileSync('package.json').toString());

const modules: Record<string, string> = Object.entries({
    ...(packagejson)['dependencies'] ?? {},
    ...(packagejson)['devDependencies'] ?? {},
} as Record<string, string>).reduce((state, [key, value]) => {
    const match = value.match(/^file:(.*)$/);

    if (match) {
        const path = nodefs.realpathSync(match[1]);
        state[key] = nodepath.resolve(nodepath.join(path, 'src'));
    }

    return state;
}, {} as Record<string, string>);

const aliases: Record<string, string> = {
    "^@$": "<rootDir>/src/index",
    "^@/(.*)$": "<rootDir>/src/$1",
};

const config: Config.InitialOptions = {
    globals: {
        NODE_ENV: "test"
    },
    rootDir: '../',
    testEnvironment: 'node',
    transform: {
        "^.+.tsx?$": ["ts-jest", {
            tsconfig: "./test/tsconfig.json",
            diagnostics: true
        }]
    },
    moduleDirectories: ["node_modules", 'src'],
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
    moduleNameMapper: {        
        ...modules,
        ...aliases,
    }
};

export default config;
