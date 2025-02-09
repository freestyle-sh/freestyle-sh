import { FreestyleSandboxes } from "freestyle-sandboxes";
import { createCommand } from "commander";
import { getDefiniteFreestyleAccessToken } from "../cli-utils/access-tokens.js";

export const logsCommand = createCommand("logs")
  // todo: add this back when freestyle supports getting logs by domain
  // .option("--domain <domain>", "Domain of deployment")
  .action(async () => {
    const api = new FreestyleSandboxes({
      apiKey: await getDefiniteFreestyleAccessToken(),
      baseUrl: process.env.FREESTYLE_API_URL,
    });

    const deployments = await api.listWebDeployments();

    let mostRecentId = deployments.entries.at(0).deploymentId;

    await api.getLogs(mostRecentId).then((logs) => {
      logs.logs.forEach((log) => {
        console.log(
          `\x1b[34m${new Date(log.timestamp).toLocaleString()}\x1b[0m`,
          log.message.trim()
        );
      });
    });
  });
