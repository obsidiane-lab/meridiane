import process from 'node:process';

function color(code, text) {
  if (!process.stdout.isTTY) return text;
  return `\u001b[${code}m${text}\u001b[0m`;
}

function line(prefix, text) {
  return `${prefix} ${text}`;
}

export function createLogger({ debug = false } = {}) {
  const prefix = color('35', 'meridiane');

  return {
    debugEnabled: debug,

    title(text) {
      console.log(line('🌙', `${prefix} ${text}`));
    },

    step(text) {
      console.log(line('🔧', `${prefix} ${text}`));
    },

    info(text) {
      console.log(line('ℹ️', `${prefix} ${text}`));
    },

    success(text) {
      console.log(line('✅', `${prefix} ${text}`));
    },

    warn(text) {
      console.warn(line('⚠️', `${prefix} ${text}`));
    },

    debug(text, data) {
      if (!debug) return;
      if (data === undefined) console.log(line('🐛', `${prefix} ${text}`));
      else console.log(line('🐛', `${prefix} ${text} ${JSON.stringify(data, null, 2)}`));
    },

    error(err) {
      const msg = err?.message ?? String(err);
      console.error(line('❌', `${prefix} ${msg}`));
      if (debug && err?.stack) console.error(err.stack);
    },
  };
}

