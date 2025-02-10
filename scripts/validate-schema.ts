import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import Ajv, { type ErrorObject } from 'ajv';

const ajv = new Ajv({
  strict: false,
});

const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.schema.json'), 'utf8'));

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
  validationErrors?: ErrorObject[];
}

type SchemaErrors = {
  name: string;
  errors: ErrorObject[];
}

const schemaErrors: SchemaErrors[] = [];

const packagesDir = path.join(__dirname, '..', 'packages');
fs.readdirSync(packagesDir, { withFileTypes: true }).forEach(dirent => {
  if (dirent.isDirectory()) {
    const packageYamlPath = path.join(packagesDir, dirent.name, 'zana.yaml');

    if (fs.existsSync(packageYamlPath)) {
      const fileContents = fs.readFileSync(packageYamlPath, 'utf8');
      const packageData = yaml.load(fileContents) as PackageInfo;
      const valid = ajv.validate(schema, packageData);
      if (!valid) {
        schemaErrors.push({
          name: packageData.name,
          errors: ajv.errors || []
        });
      }
    }
  }
});

if (schemaErrors.length > 0) {
  console.error('Schema validation errors:');
  schemaErrors.forEach((error) => {
    console.error(`Package ${error.name}:`);
    error.errors.forEach((err) => {
      console.error(`  ${err.data} ${err.message}`);
    });
  });
  process.exit(1);
}
