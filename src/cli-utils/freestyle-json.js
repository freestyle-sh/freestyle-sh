import fs from "fs/promises";

export async function readFreestyleJson() {
  const json = JSON.parse(
    await fs
      .readFile("freestyle.json", "utf-8")
      .then((res) => res.toString())
      .catch(() => "{}")
  );

  json.project = json.project || {};

  return json;
}

export async function writeFreestyleJson(json) {
  await fs.writeFile("freestyle.json", JSON.stringify(json, null, 2));
}
