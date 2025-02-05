import { createCommand } from "commander";
import fs from "node:fs";
import path from "path";
import { FreestyleSandboxes } from "freestyle-sandboxes";

export const deployCommand = createCommand("deploy")
  .option("--entrypoint <entrypoint>", "Entrypoint file")
  .option("--domain <domain>", "Domain of deployment")
  .action(async () => {
    const api = new FreestyleSandboxes({
      apiKey: process.env.FREESTYLE_API_KEY,
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
          results[file] = { content, encoding: "base64" };
        }
      });
      return results;
    };

    // Read .freestyleignore file
    const freestyleIgnorePath = path.resolve(process.cwd(), ".freestyleignore");
    let ignorePatterns = ["node_modules"];
    if (fs.existsSync(freestyleIgnorePath)) {
      const ignoreContent = fs.readFileSync(freestyleIgnorePath, "utf-8");
      ignorePatterns = ignorePatterns.concat(
        ignoreContent.split(/\r?\n/).filter(Boolean)
      );
    }

    const files = readFilesRecursively("./", ignorePatterns);

    const envVars = dotenv.parse(
      fs.readFileSync(path.resolve(process.cwd(), ".env.production"))
    );

    await api
      .deployWeb(files, {
        entrypoint: deployCommand.opts(),
        envVars,
      })
      .then((result) => {
        console.log("Deployed website @ ", result.deploymentId);
      });

    await api.deployCloudstate({
      classes: fs.readFileSync(
        path.resolve(process.cwd(), ".freestyle/dist/cloudstate.js")
      ),
    });
  });
