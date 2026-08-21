import fs from 'node:fs/promises';

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || ''));
}

async function fetchJson(url) {
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    const message = error?.message ?? String(error);
    throw new Error(
      `Spec fetch failed: ${url}\n` +
        `Reason: ${message}\n` +
        `Tip: if your environment cannot access the network, use a local JSON file via --spec ./openapi.json`
    );
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Spec fetch failed: ${response.status} ${response.statusText}${body ? `\n${body}` : ''}`
    );
  }
  return response.json();
}

export async function readOpenApiSpec(specArg) {
  if (!specArg) throw new Error('Missing --spec (url or JSON file path)');
  const spec = String(specArg);

  if (isHttpUrl(spec)) {
    try {
      return await fetchJson(spec);
    } catch (error) {
      const isDocsJson = /\/api\/docs\.json$/i.test(spec);
      if (!isDocsJson) throw error;
      const fallback = spec.replace(/\/api\/docs\.json$/i, '/api/docs.jsonopenapi');
      try {
        return await fetchJson(fallback);
      } catch (fallbackError) {
        const primaryMessage = error?.message ?? String(error);
        const fallbackMessage = fallbackError?.message ?? String(fallbackError);
        throw new Error(
          `Spec fetch failed (both endpoints tried)\n` +
            `- ${spec}\n  ${primaryMessage}\n` +
            `- ${fallback}\n  ${fallbackMessage}`
        );
      }
    }
  }

  try {
    const raw = await fs.readFile(spec, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`Spec file not found: ${spec}`);
    }
    if (error?.name === 'SyntaxError') {
      throw new Error(`Invalid JSON in spec file ${spec}: ${error.message}`);
    }
    throw error;
  }
}
