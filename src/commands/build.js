import { buildServer } from "../cli-utils/cloudstate/build.js";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { createCommand } from "commander";

export const buildCommand = createCommand("build").action(async () => {
  fs.readFile(process.cwd() + "/package.json")
    .then((res) => res.toString())
    .then(() => {
      spawn("npm", ["run", "build"], {
        stdio: "inherit",
        // env: {
        //   ESBUILD_BINARY_PATH: "",
        // },
      });
    })
    .catch(() => {
      console.error("No package.json found, skipping npm run build");
    });

  await buildServer();
});
