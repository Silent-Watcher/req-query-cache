import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["tests/**/*.test.ts"],
        environment: "node",
        globals: true,
        coverage: {
            provider: "v8",
            enabled: true,
            reporter: ["html", "json", "text"],
            all: true,
            include: ["src/**/*.ts"],
        },
    },
    resolve: {
        conditions: ["my-package-dev"],
    },
});
