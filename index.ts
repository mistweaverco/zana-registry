import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface PackageInfo {
  name: string;
  description: string;
  homepage: string;
  licenses: string[];
  languages: string[];
  categories: string[];
  source: {
    id: string;
  };
  bin: Record<string, string>;
}

const packagesDir = path.join(__dirname, 'packages');
const registry: PackageInfo[] = [];

fs.readdirSync(packagesDir, { withFileTypes: true }).forEach(dirent => {
  if (dirent.isDirectory()) {
    const packageYamlPath = path.join(packagesDir, dirent.name, 'zana.yaml');

    if (fs.existsSync(packageYamlPath)) {
      const fileContents = fs.readFileSync(packageYamlPath, 'utf8');
      const packageData = yaml.load(fileContents) as PackageInfo;
      registry.push(packageData);
    }
  }
});

const registryJsonPath = path.join(__dirname, 'registry.json');
fs.writeFileSync(registryJsonPath, JSON.stringify(registry, null, 2));

console.log(`Registry file created at ${registryJsonPath}`);
