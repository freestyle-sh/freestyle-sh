export function getCloudstatePlatformBinName() {
  // Lookup table for all platforms and binary distribution packages
  const BINARY_DISTRIBUTION_PACKAGES = {
    "linux-x64": "cloudstate-linux-x64",
    "linux-arm": "cloudstate-linux-arm", // probably should've been cloudstate-linux-arm64
    "win32-x64": "cloudstate-windows-x64",
    "darwin-x64": "cloudstate-darwin-x64",
    "darwin-arm64": "cloudstate-darwin-arm64", // only real one right now
  };

  // Determine package name for this platform
  const platformSpecificPackageName =
    BINARY_DISTRIBUTION_PACKAGES[`${process.platform}-${process.arch}`];

  return platformSpecificPackageName;
}
