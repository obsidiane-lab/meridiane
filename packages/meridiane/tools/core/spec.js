import fs from 'node:fs/promises';

function isHttpUrl(v) {
  return /^https?:\/\//i.test(String(v || ''));
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Spec fetch failed: ${res.status} ${res.statusText}${body ? `\n${body}` : ''}`);
  }
  return await res.json();
}

export async function readOpenApiSpec(specArg) {
  if (!specArg) throw new Error('Missing --spec (url or JSON file path)');
  const spec = String(specArg);

  if (isHttpUrl(spec)) {
    try {
      return await fetchJson(spec);
    } catch (err) {
      const isDocsJson = /\/api\/docs\.json$/i.test(spec);
      if (!isDocsJson) throw err;
      const fallback = spec.replace(/\/api\/docs\.json$/i, '/api/docs.jsonopenapi');
      return await fetchJson(fallback);
    }
  }

  try {
    const raw = await fs.readFile(spec, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err?.code === 'ENOENT') {
      throw new Error(`Spec file not found: ${spec}`);
    }
    if (err?.name === 'SyntaxError') {
      throw new Error(`Invalid JSON in spec file ${spec}: ${err.message}`);
    }
    throw err;
  }
}

