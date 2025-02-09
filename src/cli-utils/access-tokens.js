import zod from "zod";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";

export async function readFreestyleAccessTokens() {
  const dirPath = path.join(os.homedir(), ".freestyle");
  const filePath = path.join(dirPath, "access-tokens.json");

  const tokensSchema = zod
    .object({ default: zod.object({ accessTokens: zod.string() }).optional() })
    .passthrough();
  let tokens = {};

  try {
    const data = await fs.readFile(filePath, "utf-8");
    tokens = tokensSchema.parse(JSON.parse(data));
  } catch {}

  return tokens;
}

export async function writeFreestyleAccessTokens(tokens) {
  const dirPath = path.join(os.homedir(), ".freestyle");
  const filePath = path.join(dirPath, "access-tokens.json");

  await fs.mkdir(dirPath, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(tokens, null, 2));
}

export async function getDefiniteFreestyleAccessToken() {
  if (process.env.FREESTYLE_API_KEY) {
    console.log(
      "Using access token from FREESTYLE_ACCESS_TOKEN environment variable"
    );
    return process.env.FREESTYLE_API_KEY;
  }

  const tokens = await readFreestyleAccessTokens();
  const accessToken = tokens.default?.accessTokens;

  if (!accessToken) {
    console.error("No access token found. Please run `freestyle login`.");
    process.exit(1);
  }

  return accessToken;
}
