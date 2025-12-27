import fs from 'node:fs/promises';

function isHttpUrl(v) {
  return /^https?:\/\//i.test(String(v || ''));
}

async function fetchJson(url) {
  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    const msg = err?.message ?? String(err);
    throw new Error(
      `Spec fetch failed: ${url}\n` +
        `Reason: ${msg}\n` +
        `Tip: if your environment cannot access the network, use a local JSON file via --spec ./openapi.json`
    );
  }
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
      try {
        return await fetchJson(fallback);
      } catch (err2) {
        const m1 = err?.message ?? String(err);
        const m2 = err2?.message ?? String(err2);
        throw new Error(`Spec fetch failed (both endpoints tried)\n- ${spec}\n  ${m1}\n- ${fallback}\n  ${m2}`);
      }
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
