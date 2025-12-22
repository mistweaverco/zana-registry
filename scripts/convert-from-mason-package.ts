import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

import { getZanaYAMLHeader } from "./utils";
import type { PackageInfo } from "./types";

const MASON_REGISTRY_URL =
  "https://raw.githubusercontent.com/mason-org/mason-registry/main/packages";
const packagesDir = path.join(__dirname, "..", "packages");

// Parse package ID to extract provider and package path
const parsePackageId = (
  packageId: string,
): { provider: string; packagePath: string } | null => {
  // Handle old format: pkg:provider/package-path@version
  // Remove version suffix if present
  // but handle package paths that may contain @ (e.g., scoped npm packages)
  const withoutVersion = packageId.replace(/@[^/@]+$/, "");

  if (withoutVersion.startsWith("pkg:")) {
    // Old format: pkg:provider/package-path
    const withoutPrefix = withoutVersion.substring(4); // Remove "pkg:"
    const firstSlash = withoutPrefix.indexOf("/");
    if (firstSlash === -1) {
      return null;
    }
    const provider = withoutPrefix.substring(0, firstSlash);
    let packagePath = withoutPrefix.substring(firstSlash + 1);
    // Decode URL encoding (e.g., %40 -> @)
    try {
      packagePath = decodeURIComponent(packagePath);
    } catch (e) {
      console.warn(
        `⚠ Warning: Failed to decode package path: ${packagePath}. Using as-is.`,
        e,
      );
    }
    return { provider, packagePath };
  }
  return null;
};

// Convert package ID from Mason format to Zana format
// "pkg:provider/package-id@version" -> "provider:package-id"
const convertPackageId = (masonId: string): string => {
  // Remove version suffix if present (e.g., @5.6.0)
  const withoutVersion = masonId.replace(/@[^/@]+$/, "");

  if (withoutVersion.startsWith("pkg:")) {
    // Remove "pkg:" prefix and replace first "/" with ":"
    const withoutPrefix = withoutVersion.substring(4);
    const firstSlash = withoutPrefix.indexOf("/");
    if (firstSlash === -1) {
      return masonId; // Invalid format, return as-is
    }
    const provider = withoutPrefix.substring(0, firstSlash);
    let packagePath = withoutPrefix.substring(firstSlash + 1);
    // Decode URL encoding (e.g., %40 -> @)
    try {
      packagePath = decodeURIComponent(packagePath);
    } catch (e) {
      // If decoding fails, use as-is
    }
    return `${provider}:${packagePath}`;
  }
  // Already in new format or invalid
  return masonId;
};

// Convert version_overrides if they exist
const convertVersionOverrides = (source: any): any => {
  if (source.version_overrides && Array.isArray(source.version_overrides)) {
    return {
      ...source,
      version_overrides: source.version_overrides.map((override: any) => ({
        ...override,
        id: override.id ? convertPackageId(override.id) : override.id,
      })),
    };
  }
  return source;
};

// Remove Mason-specific fields from package data
const removeMasonFields = (data: any): any => {
  const {
    neovim,
    version,
    ...rest
  } = data;
  return rest;
};

// Fetch package.yaml from Mason registry
const fetchMasonPackage = async (packageName: string): Promise<string> => {
  const url = `${MASON_REGISTRY_URL}/${packageName}/package.yaml`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch package from Mason registry: ${response.status} ${response.statusText}`,
    );
  }

  return await response.text();
};

// Main function
const main = async () => {
  const packageName = process.argv[2];

  if (!packageName) {
    console.error("Usage: tsx convert-from-mason-package.ts <package-name>");
    console.error(
      "Example: tsx convert-from-mason-package.ts bash-language-server",
    );
    process.exit(1);
  }

  try {
    console.log(`Fetching ${packageName} from Mason registry...`);
    const yamlContent = await fetchMasonPackage(packageName);

    // Parse YAML
    const masonPackageData = yaml.load(yamlContent) as any;

    if (
      !masonPackageData || !masonPackageData.source ||
      !masonPackageData.source.id
    ) {
      throw new Error("Invalid Mason package: missing source.id");
    }

    // Parse package ID to get provider and package path
    const parsed = parsePackageId(masonPackageData.source.id);
    if (!parsed) {
      throw new Error(
        `Invalid package ID format: ${masonPackageData.source.id}`,
      );
    }

    const { provider, packagePath } = parsed;

    // Convert to Zana format
    const zanaPackageData: PackageInfo = {
      ...removeMasonFields(masonPackageData),
      source: {
        ...convertVersionOverrides(masonPackageData.source),
        id: convertPackageId(masonPackageData.source.id),
      },
    };

    // Remove version field if it exists (Zana doesn't use it)
    delete (zanaPackageData as any).version;

    // Build new directory path
    // packagePath might contain slashes for nested structures (like gitlab)
    const pathParts = packagePath.split("/");
    const newPackageDir = path.join(packagesDir, provider, ...pathParts);
    const newYamlPath = path.join(newPackageDir, "zana.yaml");

    // Check if target already exists - if so, merge with existing package
    if (fs.existsSync(newYamlPath)) {
      try {
        const existingContent = fs.readFileSync(newYamlPath, "utf8");
        const existingYaml = yaml.loadAll(existingContent) as PackageInfo[];
        const existingPackage = existingYaml[0];

        if (existingPackage) {
          // If the existing package has a different name, add Mason package name as alias
          if (existingPackage.name !== zanaPackageData.name) {
            // Update the existing package with the new alias
            if (!existingPackage.aliases) {
              existingPackage.aliases = [];
            }
            // Add the Mason package name as an alias if it's different
            if (!existingPackage.aliases.includes(zanaPackageData.name)) {
              existingPackage.aliases.push(zanaPackageData.name);
            }
            // Also add the original Mason package directory name if different
            if (
              packageName !== zanaPackageData.name &&
              !existingPackage.aliases.includes(packageName)
            ) {
              existingPackage.aliases.push(packageName);
            }

            // Merge bins if they don't conflict (keep existing, add new)
            if (zanaPackageData.bin) {
              if (!existingPackage.bin) {
                existingPackage.bin = {};
              }
              Object.assign(existingPackage.bin, zanaPackageData.bin);
            }

            // Write updated existing package
            const updatedYamlContent = getZanaYAMLHeader() + "\n" +
              yaml.dump(existingPackage, {
                lineWidth: -1,
                noRefs: true,
              });
            fs.writeFileSync(newYamlPath, updatedYamlContent, "utf8");

            console.log(
              `✓ Added ${zanaPackageData.name} as alias to existing package ${existingPackage.name}`,
            );
            console.log(
              `  Source: ${MASON_REGISTRY_URL}/${packageName}/package.yaml`,
            );
            console.log(`  Target: ${newYamlPath}`);
            console.log(
              `  Package ID: ${masonPackageData.source.id} -> ${existingPackage.source.id}`,
            );
            return;
          } else {
            // Same package name - warn but overwrite (might want to update from Mason)
            console.warn(
              `⚠ Warning: Package with same name already exists: ${newYamlPath}`,
            );
            console.warn("  The file will be overwritten with Mason version.");
          }
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.warn(
          `⚠ Warning: Could not read existing file: ${errorMessage}`,
        );
        console.warn("  The file will be overwritten.");
      }
    } else {
      // If Mason package name differs from the converted package name, add it as an alias
      // This happens when Mason uses a different naming convention
      if (packageName !== zanaPackageData.name) {
        if (!zanaPackageData.aliases) {
          zanaPackageData.aliases = [];
        }
        if (!zanaPackageData.aliases.includes(packageName)) {
          zanaPackageData.aliases.push(packageName);
        }
      }
    }

    // Create new directory structure
    fs.mkdirSync(newPackageDir, { recursive: true });

    // Write updated YAML file
    const newYamlContent = getZanaYAMLHeader() + "\n" +
      yaml.dump(zanaPackageData, {
        lineWidth: -1,
        noRefs: true,
      });

    fs.writeFileSync(newYamlPath, newYamlContent, "utf8");

    console.log(`✓ Successfully converted ${packageName}`);
    console.log(`  Source: ${MASON_REGISTRY_URL}/${packageName}/package.yaml`);
    console.log(`  Target: ${newYamlPath}`);
    console.log(
      `  Package ID: ${masonPackageData.source.id} -> ${zanaPackageData.source.id}`,
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`✗ Error converting package: ${errorMessage}`);
    process.exit(1);
  }
};

main();
