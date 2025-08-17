#!/usr/bin/env node
import fs from "fs-extra"
import path from "path"
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
/**
 * Recursively replace all placeholders in files under a directory
 * @param {string} srcDir - source directory path
 * @param {Object.<string,string>} placeholders - map of placeholder -> value
 */
async function replacePlaceholdersInDir(srcDir, placeholders) {
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(srcDir, entry.name);
    if (entry.isDirectory()) {
      await replacePlaceholdersInDir(fullPath, placeholders);
    } else if (entry.isFile()) {
      let content = await fs.readFile(fullPath, 'utf8');
      for (const [key, value] of Object.entries(placeholders)) {
        const regex = new RegExp(key, 'g');
        content = content.replace(regex, value);
      }
      await fs.writeFile(fullPath, content);
    }
  }
}

/**
 * Generate a new Angular library from template
 * @param {string} libName - folder and project name
 * @param {string} packageName - NPM package name (e.g. @org/lib)
 * @param {string} version - initial version for the package
 * @param {string} urlRegistry  - NPM registry url
 */
async function generate(libName, packageName, version, urlRegistry) {
  const tplDir = path.resolve(__dirname, '../../projects/_lib_template');
  const targetDir = path.resolve(__dirname, '../../projects', libName);

  // 1) Copy the template directory
  await fs.copy(tplDir, targetDir);

  // 2) Replace placeholders __LIB_NAME__, __PACKAGE_NAME__, __VERSION__
  const placeholders = {
    '__LIB_NAME__': libName,
    '__PACKAGE_NAME__': packageName,
    '__VERSION__': version,
    '__URL_REGISTRY__': urlRegistry
  };
  await replacePlaceholdersInDir(targetDir, placeholders);

  // 3) Update the library's package.json
  const libPackageJsonPath = path.join(targetDir, 'package.json');
  if (await fs.pathExists(libPackageJsonPath)) {
    const libPkg = await fs.readJson(libPackageJsonPath);
    libPkg.name = packageName;
    libPkg.version = version;
    await fs.writeJson(libPackageJsonPath, libPkg, { spaces: 2 });
  }

  // 4) Update angular.json
  const angularJsonPath = path.resolve(__dirname, '../../angular.json');
  const ng = await fs.readJson(angularJsonPath);

  ng.projects[libName] = {
    root: `projects/${libName}`,
    sourceRoot: `projects/${libName}/src`,
    projectType: 'library',
    "architect": {
      "build": {
        "builder": "@angular/build:ng-packagr",
        "configurations": {
          "production": {
            "tsConfig": `projects/${libName}/tsconfig.lib.prod.json`
          },
          "development": {
            "tsConfig": `projects/${libName}/tsconfig.lib.json`
          }
        },
        "defaultConfiguration": "production"
      },
      "test": {
        "builder": "@angular/build:karma",
        "options": {
          "tsConfig": `projects/${libName}/tsconfig.spec.json`
        }
      }
    }
  };
  await fs.writeJson(angularJsonPath, ng, { spaces: 2 });

  console.log(`✅ Library '${libName}' generated at projects/${libName}` +
    ` with package '${packageName}@${version}'`);
}

// CLI args: node generate-lib.js <lib-name> <package-name> <version>
const [,, libName, packageName, version = '0.0.1', urlRegistry] = process.argv;
if (!libName || !packageName) {
  console.error('Usage: generate-lib.js <lib-name> <package-name> [version]');
  process.exit(1);
}

generate(libName, packageName, version, urlRegistry).catch(err => {
  console.error(err);
  process.exit(1);
});
