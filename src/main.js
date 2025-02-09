import "dotenv/config";
import { program } from "commander";
import { deployCommand } from "./commands/deploy.js";
import { logsCommand } from "./commands/logs.js";
import { buildCommand } from "./commands/build.js";
import { devCommand } from "./commands/dev.js";
import { loginCommand } from "./commands/login.js";

program
  .version("1.0.0")
  .addCommand(deployCommand)
  .addCommand(logsCommand)
  .addCommand(buildCommand)
  .addCommand(devCommand)
  .addCommand(loginCommand);

program.parse(process.argv);
