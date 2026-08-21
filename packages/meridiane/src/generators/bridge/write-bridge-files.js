import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readJson, writeJsonIfChanged } from '../../infrastructure/json.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(currentDir, '../../..');
const bridgeTemplateDir = path.join(packageRoot, 'templates', 'angular-bridge');

export async function writeBridgeFiles({
  projectDir,
  libName,
  packageName,
  version,
  projectReadmePath,
  debug,
  log,
}) {
  if (debug) {
    log?.debug?.('[meridiane] generate lib', {
      libName,
      packageName,
      version,
      targetDir: projectDir,
    });
  }

  await fs.rm(projectDir, { recursive: true, force: true });
  await fs.mkdir(projectDir, { recursive: true });
  await fs.cp(bridgeTemplateDir, projectDir, { recursive: true });

  await replacePlaceholders(projectDir, {
    '__LIB_NAME__': libName,
    '__PACKAGE_NAME__': packageName,
  });

  const packageJsonPath = path.join(projectDir, 'package.json');
  const packageJson = await readJson(packageJsonPath);
  packageJson.name = packageName;
  packageJson.version = version;
  await writeJsonIfChanged(packageJsonPath, packageJson);

  await appendProjectReadme(path.join(projectDir, 'README.md'), projectReadmePath, debug, log);
}

export async function configureBridgeOutput({ projectDir, distRoot, libName, log }) {
  const ngPackagePath = path.join(projectDir, 'ng-package.json');
  const ngPackage = await readJson(ngPackagePath);
  const outputDir = path.join(distRoot, libName);

  ngPackage.dest = path.relative(projectDir, outputDir).split(path.sep).join('/');
  await writeJsonIfChanged(ngPackagePath, ngPackage);
  log?.debug?.('ng-package.json dest overridden', { dest: ngPackage.dest });
}

async function replacePlaceholders(directory, placeholders) {
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await replacePlaceholders(filePath, placeholders);
      continue;
    }
    if (!entry.isFile()) continue;

    const content = await fs.readFile(filePath, 'utf8');
    const rendered = Object.entries(placeholders)
      .reduce((value, [placeholder, replacement]) => value.replaceAll(placeholder, replacement), content);
    if (rendered !== content) await fs.writeFile(filePath, rendered);
  }
}

async function appendProjectReadme(targetPath, sourcePath, debug, log) {
  if (!sourcePath) return;

  const projectReadme = await readText(sourcePath);
  if (!projectReadme?.trim()) return;

  const bridgeReadme = await readText(targetPath);
  if (!bridgeReadme?.trim()) {
    await fs.writeFile(targetPath, projectReadme);
    if (debug) log?.debug?.('[meridiane] project README copied', { source: sourcePath });
    return;
  }

  const combinedReadme =
    `${bridgeReadme.trimEnd()}\n\n---\n\n## Documentation du projet\n\n${projectReadme.trimStart()}`;
  await fs.writeFile(targetPath, combinedReadme);
  if (debug) log?.debug?.('[meridiane] project README appended', { source: sourcePath });
}

async function readText(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return undefined;
  }
}
