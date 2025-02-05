import { build } from "esbuild";
import {
  makeAllPackagesExternalPlugin,
  removeDecoratorsPlugin,
} from "./cloudstate/tree-shake.js";

export async function getFreestyleConfig() {
  await build({
    entryPoints: ["./freestyle.config.ts"],
    outfile: "./.freestyle/freestyle.config.js",
    bundle: true,
    platform: "node",
    format: "esm",
    target: "esnext",
    sourcemap: "inline",
    plugins: [removeDecoratorsPlugin, makeAllPackagesExternalPlugin],
  });

  // TODO: use esbuild so this can be run in in package
  return await import(
    `${process.cwd()}/.freestyle/freestyle.config.js?${Date.now()}`
  )
    // .catch(() => import(`${Deno.cwd()}/freestyle.config.ts?${Date.now()}`))
    .then((mod) => mod.default ?? {})
    .catch((e) => {
      console.error("No freestyle.config.js found, skipping.");
      console.error(e);
      return {};
    });
}
