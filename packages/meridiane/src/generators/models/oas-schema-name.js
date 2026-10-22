import {pascalCase} from './utils.js';

export function parseOpenApiSchemaName(originalName) {
  const raw = String(originalName || '');
  const i = raw.indexOf('-');
  let baseRaw = i >= 0 ? raw.slice(0, i) : raw;
  let groupRaw = i >= 0 ? raw.slice(i + 1) : '';

  let baseVariant = 'none';
  if (/\.jsonld$/i.test(baseRaw)) {
    baseVariant = 'jsonld';
    baseRaw = baseRaw.replace(/\.jsonld$/i, '');
  } else if (/\.multipart$/i.test(baseRaw)) {
    baseVariant = 'multipart';
    baseRaw = baseRaw.replace(/\.multipart$/i, '');
  }

  let isMergePatch = false;
  if (/\.jsonmergepatch$/i.test(baseRaw)) {
    isMergePatch = true;
    baseRaw = baseRaw.replace(/\.jsonmergepatch$/i, '');
  }
  if (/\.jsonmergepatch$/i.test(groupRaw)) {
    isMergePatch = true;
    groupRaw = groupRaw.replace(/\.jsonmergepatch$/i, '');
  }

  return {basePath: baseRaw, groupPath: groupRaw, baseVariant, isMergePatch};
}

export function baseTsNameFromBasePath(basePath) {
  const parts = String(basePath || '').split('.').filter(Boolean);
  if (parts.length === 0) return 'Model';
  const a = pascalCase([parts[0]]);
  if (parts.length === 1) return a;
  const b = pascalCase([parts[1]]);
  if (parts.length === 2 && b.toLowerCase().startsWith(a.toLowerCase())) return b;
  return parts.map((part) => pascalCase([part])).join('');
}

export function groupTsNameFromGroupPath(groupPath) {
  const tokens = String(groupPath || '').split(/[._:]+/g).filter(Boolean);
  return pascalCase(tokens);
}
