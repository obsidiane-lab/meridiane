import fs from 'node:fs/promises';

function stripJsonComments(input) {
  let out = '';
  let i = 0;
  let inString = false;
  let stringQuote = '"';
  while (i < input.length) {
    const ch = input[i];

    if (inString) {
      out += ch;
      if (ch === '\\') {
        // skip escaped char
        i += 2;
        continue;
      }
      if (ch === stringQuote) inString = false;
      i += 1;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      stringQuote = ch;
      out += ch;
      i += 1;
      continue;
    }

    // line comment
    if (ch === '/' && input[i + 1] === '/') {
      i += 2;
      while (i < input.length && input[i] !== '\n') i += 1;
      continue;
    }

    // block comment
    if (ch === '/' && input[i + 1] === '*') {
      i += 2;
      while (i < input.length && !(input[i] === '*' && input[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }

    out += ch;
    i += 1;
  }
  return out;
}

export async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(stripJsonComments(raw));
  }
}

export async function writeJsonIfChanged(filePath, data) {
  const next = JSON.stringify(data, null, 2) + '\n';
  try {
    const prev = await fs.readFile(filePath, 'utf8');
    if (prev === next) return false;
  } catch {
    // ignore (file missing / unreadable)
  }
  await fs.writeFile(filePath, next, 'utf8');
  return true;
}
