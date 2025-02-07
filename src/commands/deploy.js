import { createCommand } from "commander";
import fs from "node:fs";
import path from "path";
import { FreestyleSandboxes } from "freestyle-sandboxes";
import dotenv from "dotenv";

export const deployCommand = createCommand("deploy")
  .option("--entrypoint <entrypoint>", "Entrypoint file")
  .option("--domain <domain>", "Domain of deployment")
  .option("--cloudstate <cloudstate>", "Cloudstate file")
  .action(async () => {
    const api = new FreestyleSandboxes({
      apiKey: process.env.FREESTYLE_API_KEY,
      baseUrl: process.env.FREESTYLE_API_URL,
    });

    const readFilesRecursively = (dir, ignorePatterns = []) => {
      let results = {};
      const list = fs.readdirSync(dir);
      list.forEach((file) => {
        file = path.resolve(dir, file);
        const relativePath = path.relative(process.cwd(), file);

        // Check if the file should be ignored
        if (ignorePatterns.some((pattern) => relativePath.includes(pattern))) {
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
    let ignorePatterns = ["node_modules", ".git"];
    if (fs.existsSync(freestyleIgnorePath)) {
      const ignoreContent = fs.readFileSync(freestyleIgnorePath, "utf-8");
      ignorePatterns = ignorePatterns.concat(
        ignoreContent.split(/\r?\n/).filter(Boolean)
      );
    }

    const files = readFilesRecursively("./", ignorePatterns);

    let envFile = "";
    const domain = deployCommand.opts().domain;
    try {
      envFile = fs.readFileSync(path.resolve(process.cwd(), ".env.production"));
    } catch {}
    const envVars = {
      ...dotenv.parse(envFile),
      DEFAULT_CLOUDSTATE_URL:
        (domain.endsWith(".localhost") ? "http://" : "https://") + domain,
    };

    await api
      .deployWeb(files, {
        entrypoint: deployCommand.opts().entrypoint,
        envVars,
        domains: [domain],
      })
      .then((result) => {
        console.log(result);
        console.log(
          "Deployed website @ ",
          (domain.endsWith(".localhost") ? "http://" : "https://") +
            result.domains[0]
        );
        console.log("Web Deployment Id: ", result.deploymentId);
      });

    let cloudstateFile;

    try {
      cloudstateFile = fs.readFileSync(
        path.resolve(
          process.cwd(),
          deployCommand.opts().cloudstate || ".freestyle/dist/cloudstate.js"
        )
      );
    } catch {}

    if (cloudstateFile) {
      api.deployCloudstate({
        classes: cloudstateFile.toString(),
        config: {
          envVars: envVars,
          domains: [domain],
        },
      });
    }
  });
