module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",

  // Transform agar Jest dapat membaca import ES modules
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
    "^.+\\.(js|jsx)$": "babel-jest"
  },

  // Supaya Jest bisa baca alias @/...
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^../lib/prisma$": "<rootDir>/__mocks__/lib/prisma.ts"
  },

  moduleFileExtensions: ["ts", "js", "json", "tsx", "jsx"],
};
