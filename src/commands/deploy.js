import { createCommand } from "commander";
import fs from "node:fs";
import path from "path";
import { FreestyleSandboxes } from "freestyle-sandboxes";
import dotenv from "dotenv";
import { getDefiniteFreestyleAccessToken } from "../cli-utils/access-tokens.js";
import {
  readFreestyleJson,
  writeFreestyleJson,
} from "../cli-utils/freestyle-json.js";
import promptly from "promptly";
import { getEntrypoints } from "../cli-utils/detect-project-type.js";
import { minimatch } from "minimatch";
import chalk from "chalk";
import { prepareDirForDeploymentSync } from "freestyle-sandboxes/utils";

function isValidDomain(domain) {
  return domain.match(/^[a-z0-9-]+(\.[a-z0-9-]+)*$/);
}

export const deployCommand = createCommand("deploy")
  .option("--web <web>", "Web Entrypoint file")
  .option("--build", "Build on freestyle")
  .option("--timeout <timeout>", "Timeout for deployment")
  .option("--domain <domain>", "Domain of deployment")
  .option("--cloudstate <cloudstate>", "Cloudstate file")
  .option(
    "--cloudstate-database-id <cloudstateDatabaseId>",
    "Cloudstate Database Id"
  )
  .action(async () => {
    const api = new FreestyleSandboxes({
      apiKey: await getDefiniteFreestyleAccessToken(),
      baseUrl: process.env.FREESTYLE_API_URL,
    });

    const freestyleJson = await readFreestyleJson();

    let domain = deployCommand.opts().domain;

    if (!domain && freestyleJson.project.domain) {
      domain = freestyleJson.project.domain;
    }

    if (!domain) {
      console.log("To deploy, you'll need to provide a domain");
      console.log(
        "You can authorize your account to use a custom domain at: https://admin.freestyle.sh/dashboard/domains"
      );
      console.log(
        "Or you can use a freestyle .style.dev domain provided by freestyle"
      );
      const maybeDomain = await promptly.prompt("Enter a domain: ");

      if (!maybeDomain) {
        console.error("Domain is required");
        process.exit(1);
      }

      if (!isValidDomain(maybeDomain)) {
        return console.error("Invalid domain");
      }

      domain = maybeDomain;
      freestyleJson.project.domain = domain;
    }

    let webEntrypoint = deployCommand.opts().web;
    let cloudstateEntrypoint = deployCommand.opts().cloudstate;

    if (!webEntrypoint && !cloudstateEntrypoint) {
      const entrypoints = await getEntrypoints(process.cwd());
      webEntrypoint = entrypoints?.web;
      cloudstateEntrypoint = entrypoints?.cloudstate;
    }

    const readFilesRecursively = (dir, ignorePatterns = []) => {
      let results = {};
      const list = fs.readdirSync(dir);
      list.forEach((file) => {
        file = path.resolve(dir, file);
        const relativePath = path.relative(process.cwd(), file);

        // Check if the file should be ignored
        if (
          ignorePatterns.some((pattern) => minimatch(relativePath, pattern))
        ) {
          return;
        }

        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
          results = {
            ...results,
            ...readFilesRecursively(file, ignorePatterns),
          };
        } else {
          const content = fs.readFileSync(file, { encoding: "base64" });
          results[file.split(process.cwd() + "/")[1]] = {
            content,
            encoding: "base64",
          };
        }
      });
      return results;
    };

    // Read .freestyleignore file
    const freestyleIgnorePath = path.resolve(process.cwd(), ".freestyleignore");
    let ignorePatterns = [
      ".git",
      "**/node_modules/**",
      "**/node_modules/*",
      "node_modules",
    ];
    if (fs.existsSync(freestyleIgnorePath)) {
      const ignoreContent = fs.readFileSync(freestyleIgnorePath, "utf-8");
      ignorePatterns = ignorePatterns.concat(
        ignoreContent.split(/\r?\n/).filter(Boolean)
      );
    }

    const files = prepareDirForDeploymentSync("./", ignorePatterns);

    let envFile = "";

    try {
      envFile = fs.readFileSync(path.resolve(process.cwd(), ".env.production"));
    } catch {}

    const envVars = {
      ...dotenv.parse(envFile),
      DEFAULT_CLOUDSTATE_URL:
        (domain.endsWith(".localhost") ? "http://" : "https://") + domain,
    };

    const timeout = Number.isNaN(deployCommand.opts().timeout)
      ? undefined
      : Number(deployCommand.opts().timeout);

    if (webEntrypoint || deployCommand.opts().build) {
      if (webEntrypoint && !files["files"][webEntrypoint]) {
        console.error(`Web entrypoint "${webEntrypoint}" not found in files`);
        process.exit(1);
      }

      await api
        .deployWeb(files, {
          entrypoint: webEntrypoint,
          envVars,
          domains: [domain],
          timeout,
          serverStartCheck: true,
          build: deployCommand.opts().build !== undefined,
        })
        .then((result) => {
          // TODO: fix when we have better error handling
          if (result.message) {
            return Promise.reject(result.message);
          }

          let extraPadding = "";
          if (cloudstateEntrypoint) {
            extraPadding = " ".repeat(7);
          }

          console.log(
            "Deployed website @ " + extraPadding,
            chalk.blue(
              chalk.underline(
                (domain.endsWith(".localhost") ? "http://" : "https://") +
                  result.domains[0]
              )
            )
          );
          console.log(
            chalk.gray(
              "Web Deployment Id:  " + extraPadding + result.deploymentId
            )
          );
        });
    }

    let cloudstateFile;

    if (cloudstateEntrypoint) {
      try {
        cloudstateFile = fs
          .readFileSync(path.resolve(process.cwd(), cloudstateEntrypoint))
          .toString();
      } catch {
        console.error(
          `Cloudstate entrypoint "${cloudstateEntrypoint}" not found in files`
        );
      }

      if (cloudstateFile) {
        await api
          .deployCloudstate({
            classes: cloudstateFile,
            config: {
              envVars: envVars,
              domains: [domain],
              cloudstateDatabaseId:
                deployCommand.opts().cloudstateDatabaseId ||
                freestyleJson.project.cloudstateDatabaseId,
            },
          })
          .then((res) => {
            console.log(
              chalk.gray("Cloudstate Deployment Id:  " + res.deploymentId)
            );
            console.log(
              chalk.gray(
                "Cloudstate Database Id:    " + res.cloudstateDatabaseId
              )
            );
            freestyleJson.project.cloudstateDatabaseId =
              res.cloudstateDatabaseId;
          });
      }
    }

    await writeFreestyleJson(freestyleJson);
  });
