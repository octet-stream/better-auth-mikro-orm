import {defineConfig} from "vitest/config"

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // ! Remove this when I figure out how to support their updated test suite
    exclude: ["tests/node/better-auth.test.ts"],
    coverage: {
      include: ["src/**/*.ts"]
    }
  }
})
