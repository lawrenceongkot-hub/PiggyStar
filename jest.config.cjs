module.exports = {
preset: 'ts-jest',
testEnvironment: 'node',
testMatch: ['**/tests/**/*.test.ts', '**/*.spec.ts'],
moduleFileExtensions: ['ts', 'js', 'json', 'node'],
roots: ['<rootDir>'],
transform: {
'^.+\\.tsx?$': ['ts-jest', {
tsconfig: 'tsconfig.json',
}],
},
transformIgnorePatterns: [
'/node_modules/(?!uuid/)',
],
};