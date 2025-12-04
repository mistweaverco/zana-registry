import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

import { getZanaYAMLHeader } from "./utils";
import type { PackageInfo } from "./types";
const packagesDir = path.join(__dirname, "..", "packages");

fs.readdirSync(packagesDir, { withFileTypes: true }).forEach((dirent) => {
  if (dirent.isDirectory()) {
    const packageYamlPath = path.join(packagesDir, dirent.name, "package.yaml");

    if (fs.existsSync(packageYamlPath)) {
      const fileContents = fs.readFileSync(packageYamlPath, "utf8");
      const packageData = yaml.load(fileContents) as PackageInfo;
      packageData.source.id = packageData.source.id.replace(/@.*$/, "");
      packageData.source.id = decodeURIComponent(packageData.source.id);
      const zanaYamlPath = path.join(packagesDir, dirent.name, "zana.yaml");
      fs.writeFileSync(
        zanaYamlPath,
        getZanaYAMLHeader() + "\n" + yaml.dump(packageData),
      );
      fs.unlinkSync(packageYamlPath);
      console.log(`Converted ${packageYamlPath} to ${zanaYamlPath}`);
    }
  }
});
