import { buildServer } from "../cli-utils/cloudstate/build.js";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { createCommand } from "commander";

export const buildCommand = createCommand("build").action(async () => {
  fs.readFile(process.cwd() + "/package.json")
    .then((res) => res.toString())
    .then((res) => {
      if (JSON.parse(res)?.scripts?.build) {
        spawn("npm", ["run", "build"], {
          stdio: "inherit",
          // env: {
          //   ESBUILD_BINARY_PATH: "",
          // },
        });
      } else {
        console.log("No build script found, skipping npm run build");
      }
    })
    .catch(() => {
      console.log("No package.json found, skipping npm run build");
    });

  await buildServer();
});
