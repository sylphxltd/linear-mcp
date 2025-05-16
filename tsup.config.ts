import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts", "src/cli.ts"],
	format: ["esm", "cjs"],
	dts: true,
	splitting: false,
	sourcemap: true,
	clean: true,
	shims: true, // Needed for __dirname, __filename, etc. in ESM
	// external: [], // Add workspace packages if any are used directly
});
