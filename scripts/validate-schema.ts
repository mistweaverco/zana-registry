import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import Ajv from "ajv";

import type {
  PackageInfoWithValidationErrorsSupport,
  SchemaErrors,
} from "./types";

import { getZanaYAMLHeader } from "./utils";

const ajv = new Ajv({
  strict: false,
});

const schema = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "package.schema.json"), "utf8"),
);

const schemaErrors: SchemaErrors[] = [];

const packagesDir = path.join(__dirname, "..", "packages");
fs.readdirSync(packagesDir, { withFileTypes: true }).forEach((dirent) => {
  if (dirent.isDirectory()) {
    const packageYamlPath = path.join(packagesDir, dirent.name, "zana.yaml");

    if (fs.existsSync(packageYamlPath)) {
      const fileContents = fs.readFileSync(packageYamlPath, "utf8");
      const packageData = yaml.loadAll(
        fileContents,
      ) as PackageInfoWithValidationErrorsSupport[];
      const validSchema = ajv.validate(schema, packageData[0]);
      if (!validSchema) {
        schemaErrors.push({
          name: packageData[0].name,
          errors: ajv.errors || [],
        });
      }
      if (!fileContents.startsWith(getZanaYAMLHeader())) {
        schemaErrors.push({
          name: packageData[0].name,
          errors: [
            {
              instancePath: "",
              schemaPath: "",
              keyword: "header",
              params: {},
              message: "Missing or incorrect YAML header",
              data: "YAML Header",
            },
          ],
        });
      }
    }
  }
});

if (schemaErrors.length > 0) {
  console.error("Schema validation errors:");
  schemaErrors.forEach((error) => {
    console.error(`Package ${error.name}:`);
    error.errors.forEach((err) => {
      console.error(`  ${err.data} ${err.message}`);
    });
  });
  process.exit(1);
}
