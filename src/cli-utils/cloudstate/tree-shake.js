import { build } from "esbuild";
import { getFinalOutputDirectory, getOutputDirectory } from "./paths.js";
import { join } from "node:path";
import fs from "node:fs/promises";

export const makeAllPackagesExternalPlugin = {
  name: "make-all-packages-external",
  setup(build) {
    const filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/; // Must not start with "/" or "./" or "../"
    build.onResolve({ filter }, (args) => ({
      path: args.path,
      external: true,
    }));
  },
};

export const removeDecoratorsPlugin = {
  name: "remove-decorators",
  setup(build) {
    build.onLoad({ filter: /\.[jt]sx?$/ }, async (args) => {
      const source = await fs.readFile(args.path, "utf8");

      // TODO: cursed
      const codeWithoutDecorators = source.replaceAll("@cloudstate", "");

      return {
        contents: codeWithoutDecorators,
        loader: "tsx",
      };
    });
  },
};

/**
 * @param basePath the root of the project
 */
export async function treeShakeProject(basePath) {
  const plugins = [removeDecoratorsPlugin];

  // if there's no package.json assume it's a deno project and assume that doesn't need dependencies bundled
  // todo: use deno.json to resolve dependencies
  await fs.readFile(join(basePath, "./package.json")).catch(() => {
    plugins.push(makeAllPackagesExternalPlugin);
  });

  await build({
    entryPoints: [join(getOutputDirectory(basePath), "__cloudstate__index.ts")],
    bundle: true,
    //   minify: true,
    treeShaking: true,
    sourcemap: "inline",
    sourceRoot: "",
    format: "esm",
    outfile: join(getFinalOutputDirectory(basePath), "cloudstate.js"),
    // external: ["npm:freestyle-sh", "freestyle-sh", "freestyle"],
    keepNames: true,
    plugins: plugins,
    banner: {},
  });
}
