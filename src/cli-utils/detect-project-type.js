import fs from "fs";
import path from "node:path";

export async function isAstroProject(directory) {
  return fs.existsSync(path.join(directory, "astro.config.mjs"));
}

export async function getEntrypoints(directory) {
  if (await isAstroProject(directory)) {
    console.log("Astro project detected");
    const entrypoints = {
      web: "dist/server/entry.mjs",
      cloudstate: ".freestyle/dist/cloudstate.js",
    };
    console.log("Using web entrypoint", entrypoints.web);
    console.log("Using cloudstate entrypoint", entrypoints.cloudstate);
    return entrypoints;
  }
}
