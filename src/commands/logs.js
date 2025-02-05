import { FreestyleSandboxes } from "freestyle-sandboxes";
import { createCommand } from "commander";

export const logsCommand = createCommand("logs")
  .option("--domain <domain>", "Domain of deployment")
  .action(async () => {
    const api = new FreestyleSandboxes({
      apiKey: process.env.FREESTYLE_API_KEY,
    });

    await api
      .getLogs({
        domains: [logsCommand.opts().domain],
      })
      .then((logs) => {
        console.log(logs);
      });
  });
