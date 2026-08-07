module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    moduleNameMapper: {
        '@/(.*)$': '<rootDir>/src/$1',
        config: '<rootDir>/config.js',
        '\\.(css|less|scss)$': '<rootDir>/test/styleMock.js',
        '\\.(svg|png|jpg|jpeg|gif|webp)$': '<rootDir>/test/fileMock.js',
    },
}
