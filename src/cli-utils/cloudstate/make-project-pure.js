import ts from "typescript";
import * as fs from "node:fs";
import {
  getFinalOutputDirectory,
  getFreestyleDirectory,
  getOutputDirectory,
} from "./paths.js";
import * as path from "node:path";

/**
 * @description adds the `__@PURE__` comment to all top level variables and
 * expressions so that esbuild can aggressively tree shake them.
 */
function createPureAnnotationTransformer(context) {
  const visit = (node) => {
    if (ts.isVariableStatement(node) || ts.isExpressionStatement(node)) {
      let expression;
      if (ts.isVariableStatement(node)) {
        const declaration = node.declarationList.declarations[0];
        if (declaration) {
          expression = declaration.initializer;
        }
      } else {
        expression = node.expression;
      }

      if (expression && ts.isCallExpression(expression)) {
        const pureComment = {
          kind: ts.SyntaxKind.MultiLineCommentTrivia,
          text: " @__PURE__ ",
          hasTrailingNewLine: false,
          pos: -1,
          end: -1,
        };
        // @ts-ignore: idk how to type this
        expression.pos = -1;
        // @ts-ignore: idk how to type this
        expression.end = -1;
        // @ts-ignore: idk how to type this
        expression.emitNode = {
          leadingComments: [pureComment],
          trailingComments: [],
        };
      }
    }

    return ts.visitEachChild(node, visit, context);
  };

  // @ts-ignore: hard to type this
  return (sourceFile) => ts.visitNode(sourceFile, visit);
}

function processDirectory(directoryPath) {
  const filePaths = fs.readdirSync(directoryPath).flatMap((file) => {
    const filePath = path.join(directoryPath, file);
    if (
      fs.statSync(filePath).isDirectory() &&
      (!filePath.includes("node_modules/") ||
        filePath.includes("node_modules/freestyle-")) &&
      // !filePath.includes("dist") &&
      !filePath.includes(".freestyle") &&
      !filePath.includes("_fresh")
    ) {
      return processDirectory(filePath);
    } else if (
      (path.extname(file) === ".ts" || path.extname(file) === ".js") &&
      !filePath.startsWith(getOutputDirectory(directoryPath)) &&
      !filePath.startsWith(getFinalOutputDirectory(directoryPath)) &&
      !filePath.includes(".test.") &&
      !filePath.includes(".d.ts")
    ) {
      return [filePath]; // Wrap filePath in an array
    } else {
      return []; // Always return an array
    }
  });

  return filePaths; // Return the array of file paths
}

/**
 * Replaces all import paths that end with '.ts' with '.js'.
 */
function createImportTransformer() {
  // @ts-ignore: hard to type this
  return function (context) {
    return function (sourceFile) {
      function visit(node) {
        // Check if the node is an import declaration
        if (ts.isImportDeclaration(node)) {
          // Get the import path
          const importPath = node.moduleSpecifier.getText(sourceFile);

          // Check if the import path ends with '.ts'
          if (importPath.endsWith('.ts"') || importPath.endsWith(".ts'")) {
            // Replace '.ts' with '.js'
            const newImportPath = importPath
              .replace(".d.ts", ".js")
              .replace(".ts", ".js");

            // Create a new import declaration with the updated import path
            return ts.factory.updateImportDeclaration(
              node,
              node.modifiers,
              node.importClause,
              ts.factory.createStringLiteral(newImportPath.slice(1, -1)), // Remove quotes
              undefined
            );
          }
        }

        return ts.visitEachChild(node, visit, context);
      }

      return ts.visitNode(sourceFile, visit);
    };
  };
}

function findLowestCommonDirectory(paths) {
  if (paths.length === 0) {
    return "";
  }

  const splitPaths = paths.map((p) => p.split(path.sep));
  const minLength = Math.min(...splitPaths.map((p) => p.length));

  let commonPath = "";
  for (let i = 0; i < minLength; i++) {
    const segment = splitPaths[0][i];
    if (splitPaths.every((p) => p[i] === segment)) {
      commonPath = path.join(commonPath, segment);
    } else {
      break;
    }
  }

  return "/" + commonPath;
}

export function makeProjectPure(basePath) {
  const exportedClasses = {};

  /**
   * @description adds the export keyword to all top level classes that are not
   * exported and saves the exported classes to a map
   */
  function createExportTransformer(context) {
    // @ts-ignore: hard to type this
    return (sourceFile) => {
      const visit = (node) => {
        // Check if the node is a top-level class declaration
        if (
          ts.isClassDeclaration(node) &&
          node.modifiers?.some(
            (mod) =>
              mod.kind === ts.SyntaxKind.Decorator &&
              mod.getText() === "@cloudstate"
          )
        ) {
          // If the class is not exported, add the ExportKeyword modifier
          if (
            !node.modifiers?.some(
              (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
            )
          ) {
            const exportModifier = ts.factory.createModifier(
              ts.SyntaxKind.ExportKeyword
            );
            const newModifiers = node.modifiers
              ? [exportModifier, ...node.modifiers]
              : [exportModifier];
            node = ts.factory.updateClassDeclaration(
              node,
              newModifiers,
              node.name,
              node.typeParameters,
              node.heritageClauses,
              node.members
            );
          }
          const filePathWithoutDirectory = sourceFile.fileName.replace(
            basePath,
            "."
          );
          exportedClasses[filePathWithoutDirectory] ??= [];

          if (!ts.isClassDeclaration(node)) {
            throw new Error("Expected class declaration");
          }

          if (!node.name) {
            throw new Error("Expected class to have a name");
          }

          exportedClasses[filePathWithoutDirectory].push(node.name.text);
          return node;
        }
        return ts.visitEachChild(node, visit, context);
      };
      return ts.visitNode(sourceFile, visit);
    };
  }

  if (!fs.existsSync(getFreestyleDirectory(basePath))) {
    fs.mkdirSync(getFreestyleDirectory(basePath));
  }

  if (fs.existsSync(getOutputDirectory(basePath))) {
    fs.rmSync(getOutputDirectory(basePath), { recursive: true, force: true });
  }

  fs.mkdirSync(getOutputDirectory(basePath));

  const filePaths = processDirectory(basePath);

  const program = ts.createProgram(filePaths, {
    sourceMap: true,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    outDir: getOutputDirectory(basePath),
    inlineSources: true,
    allowJs: true,
    // inlineSourceMap: true,
    // sourceRoot: directoryPath,
    // inlineSourceMap: true,
  });

  const transformers = {
    before: [
      createPureAnnotationTransformer,
      createExportTransformer,
      createImportTransformer(),
    ],
  };

  program.emit(
    undefined,
    (fileName, data) => {
      const filePath = path.dirname(fileName);
      if (!fs.existsSync(filePath)) {
        fs.mkdirSync(filePath, { recursive: true });
      }
      fs.writeFileSync(fileName, data);
    },
    undefined,
    undefined,
    transformers
  );

  processDirectory(basePath);

  // to handle if the input files had dependencies form outside the project root
  const outputBaseUrl = findLowestCommonDirectory(
    program
      .getSourceFiles()
      .filter((file) => !file.fileName.endsWith(".d.ts"))
      .map((file) => file.fileName)
  );

  // the path that needs to be added to the imports in the index file due to
  // modules from outside the project root being used
  const extraPath = basePath.replace(outputBaseUrl, "");

  // TODO: use logging package so that we can enable this with --verbose
  // console.log("searching for cloudstate in:", basePath);
  // console.log("found implicate root:", outputBaseUrl);

  const indexFileContent = Object.entries(exportedClasses)
    .map(([file, classes]) =>
      classes
        .map((className) => {
          if (file.includes("node_modules/freestyle-")) {
            return `export { ${className} } from '${
              file.split("node_modules/")[1].split("/")[0]
            }';`;
          }

          // handle global paths
          if (file.startsWith("/")) {
            return `export { ${className} } from '${file.replace(
              ".ts",
              ".js"
            )}';`;
          }

          // handle relative paths
          return `export { ${className} } from '${
            "./" +
            extraPath.split("/").slice(1).join("/") +
            file.replace(".ts", ".js").slice(1)
          }';`;
        })
        .join("\n")
    )
    .join("\n");

  fs.writeFileSync(
    path.join(getOutputDirectory(basePath), "__cloudstate__index.ts"),
    indexFileContent
  );
}

export function removePureProject(basePath) {
  fs.rmSync(getOutputDirectory(basePath), { recursive: true, force: true });
}
