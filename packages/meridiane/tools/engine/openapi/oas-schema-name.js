import { canonicalizeMediaType } from './oas-contract.js';

function pascalizeTokens(tokens) {
  return tokens
    .filter(Boolean)
    .map((t) => String(t).replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, ''))
    .filter(Boolean)
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .join('');
}

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

  const basePath = baseRaw;
  const groupPath = groupRaw;

  return {
    originalName: raw,
    basePath,
    groupPath,
    baseVariant,
    isMergePatch,
    key: `${basePath.toLowerCase()}|${groupPath.toLowerCase()}`,
  };
}

export function baseTsNameFromBasePath(basePath) {
  const parts = String(basePath || '').split('.').filter(Boolean);
  if (parts.length === 0) return 'Model';
  const a = pascalizeTokens([parts[0]]);
  if (parts.length === 1) return a;
  const b = pascalizeTokens([parts[1]]);
  if (parts.length === 2 && b.toLowerCase().startsWith(a.toLowerCase())) return b;
  return parts.map((p) => pascalizeTokens([p])).join('');
}

export function groupTsNameFromGroupPath(groupPath) {
  const tokens = String(groupPath || '').split(/[._:]+/g).filter(Boolean);
  return pascalizeTokens(tokens);
}

export function formatSuffixToken(mediaType) {
  const canon = canonicalizeMediaType(mediaType);
  const tokens = canon.split(/[\/+.-]+/g).filter(Boolean);
  const trimmed = tokens[0] === 'application' ? tokens.slice(1) : tokens;
  return pascalizeTokens(trimmed.length ? trimmed : tokens) || 'Fmt';
}

