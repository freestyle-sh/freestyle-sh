export function getFreestyleDirectory(base) {
  return `${base}/.freestyle`;
}

export function getOutputDirectory(base) {
  const freestyleDirectoryPath = getFreestyleDirectory(base);
  return `${freestyleDirectoryPath}/incomplete-dist`;
}

export function getFinalOutputDirectory(base) {
  const freestyleDirectoryPath = getFreestyleDirectory(base);
  return `${freestyleDirectoryPath}/dist`;
}
