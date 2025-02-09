import { createCommand } from "commander";
import promptly from "promptly";
import {
  readFreestyleAccessTokens,
  writeFreestyleAccessTokens,
} from "../cli-utils/access-tokens.js";

export const loginCommand = createCommand("login").action(async () => {
  console.log("Login at https://admin.freestyle.sh and create an API key");
  const apiKey = await promptly.prompt("Enter your API key: ");

  if (!apiKey) {
    console.error("API key is required");
    process.exit(1);
  }

  const tokens = readFreestyleAccessTokens();

  tokens.default = { accessTokens: apiKey };

  writeFreestyleAccessTokens(tokens);

  console.log("Authenticated Successfully");
});
