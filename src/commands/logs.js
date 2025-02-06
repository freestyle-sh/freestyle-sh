import { FreestyleSandboxes } from "freestyle-sandboxes";
import { createCommand } from "commander";

export const logsCommand = createCommand("logs")
  // todo: add this back when freestyle supports getting logs by domain
  // .option("--domain <domain>", "Domain of deployment")
  .action(async () => {
    const api = new FreestyleSandboxes({
      apiKey: process.env.FREESTYLE_API_KEY,
      baseUrl: process.env.FREESTYLE_API_URL,
    });

    const deployments = await api.listWebDeployments().then((deploy) => {
      deploy.entries;
    });

    let mostRecentId = deploy.entries.at(0).deploymentId;

    await api.getLogs(mostRecentId).then((logs) => {
      console.log(logs);
    });
  });
