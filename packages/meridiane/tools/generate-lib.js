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
  const tplDir = path.resolve(__dirname, '../templates/_lib_template');
  const workspaceRoot = process.cwd();
  const targetDir = path.resolve(workspaceRoot, 'projects', libName);

  // 1) Copy the template directory
  await fs.copy(tplDir, targetDir);

  // 2) Replace placeholders __LIB_NAME__, __PACKAGE_NAME__, __VERSION__
  const placeholders = {
    '__LIB_NAME__': libName,
    '__PACKAGE_NAME__': packageName,
    '__VERSION__': version
  };
  await replacePlaceholdersInDir(targetDir, placeholders);

  // 3) Update the library's package.json
  const libPackageJsonPath = path.join(targetDir, 'package.json');
  if (await fs.pathExists(libPackageJsonPath)) {
    const libPkg = await fs.readJson(libPackageJsonPath);
    libPkg.name = packageName;
    libPkg.version = version;
    if (urlRegistry) {
      libPkg.publishConfig = {...(libPkg.publishConfig || {}), registry: urlRegistry};
    } else if (libPkg.publishConfig?.registry) {
      delete libPkg.publishConfig.registry;
      if (Object.keys(libPkg.publishConfig).length === 0) delete libPkg.publishConfig;
    }
    await fs.writeJson(libPackageJsonPath, libPkg, { spaces: 2 });
  }

  // 4) Update angular.json
  const angularJsonPath = path.resolve(workspaceRoot, 'angular.json');
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

  const ngPackagrPkg = findUpNodeModulePackageJson(workspaceRoot, 'ng-packagr');
  if (!ngPackagrPkg) {
    console.warn(
      [
        "⚠️  'ng-packagr' n'est pas installé dans ce workspace.",
        "   Pour builder une librairie (ng-packagr), installez-le dans votre projet Angular :",
        "   npm i -D ng-packagr",
      ].join('\n')
    );
  }
}

function findUpNodeModulePackageJson(startDir, packageName) {
  let dir = startDir;
  while (true) {
    const candidate = path.join(dir, 'node_modules', packageName, 'package.json');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

// CLI args: node generate-lib.js <lib-name> <package-name> [version] <url-registry>
// CLI args: node generate-lib.js <lib-name> <package-name> [version] [url-registry]
const [,, libName, packageName, version = '0.0.1', urlRegistry] = process.argv;
if (!libName || !packageName) {
  console.error('Usage: generate-lib.js <lib-name> <package-name> [version] [url-registry]');
  process.exit(1);
}

generate(libName, packageName, version, urlRegistry).catch(err => {
  console.error(err);
  process.exit(1);
});
