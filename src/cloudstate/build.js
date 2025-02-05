import { makeProjectPure, removePureProject } from "./make-project-pure.js";
import { treeShakeProject } from "./tree-shake.js";

export async function buildServer() {
  const root = process.cwd();
  makeProjectPure(root);
  await treeShakeProject(root)
    .then(() => {
      removePureProject(root);
    })
    .catch(() => {
      console.error("error tree shaking project");
    });
}
