import { readdir, readFile } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const sourceRoots = ['src', 'es', 'en'].map((directory) =>
  resolve(projectRoot, directory),
);
const scannableExtensions = new Set([
  '.css',
  '.htm',
  '.html',
  '.js',
  '.jsx',
  '.mjs',
  '.ts',
  '.tsx',
]);
const ignoredDirectories = new Set([
  '.git',
  '.vercel',
  'coverage',
  'dist',
  'node_modules',
]);

const obviousPlaceholders = /^(?:change-?me|example|pending|placeholder|por[-_ ]?confirmar|replace[-_ ]?me|todo|your[-_ ].*|x{4,}|\*{4,}|<[^>]+>|\$\{[^}]+\})$/i;

const rules = [
  {
    id: 'unsafe-inner-html',
    description: 'Uso de innerHTML',
    pattern: /\binnerHTML\b/g,
  },
  {
    id: 'unsafe-adjacent-html',
    description: 'Uso de insertAdjacentHTML',
    pattern: /\binsertAdjacentHTML\b/g,
  },
  {
    id: 'unsafe-document-write',
    description: 'Uso de document.write/document.writeln',
    pattern: /\bdocument\s*\.\s*write(?:ln)?\s*\(/g,
  },
  {
    id: 'dynamic-eval',
    description: 'Uso de eval',
    pattern: /\beval\s*\(/g,
  },
  {
    id: 'function-constructor',
    description: 'Uso de new Function',
    pattern: /\bnew\s+Function\s*\(/g,
  },
  {
    id: 'inline-event-handler',
    description: 'Manejador de evento HTML inline',
    pattern: /<[a-z][^>]*\son[a-z][a-z0-9_-]*\s*=/gi,
  },
  {
    id: 'javascript-url',
    description: 'URL con esquema javascript:',
    pattern: /\bjavascript\s*:/gi,
  },
  {
    id: 'insecure-http-url',
    description: 'URL HTTP sin cifrar',
    pattern: /\bhttp:\/\/[^\s"'`<>]+/gi,
  },
  {
    id: 'private-key',
    description: 'Clave privada incrustada',
    pattern: /-----BEGIN (?:EC |OPENSSH |PGP |RSA )?PRIVATE KEY-----/g,
  },
  {
    id: 'aws-access-key',
    description: 'Identificador de acceso AWS incrustado',
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  },
  {
    id: 'github-token',
    description: 'Token de GitHub incrustado',
    pattern: /\bgh(?:p|o|u|s|r)_[A-Za-z0-9_]{36,255}\b/g,
  },
  {
    id: 'google-api-key',
    description: 'Clave de API de Google incrustada',
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
  },
  {
    id: 'stripe-secret-key',
    description: 'Clave secreta de Stripe incrustada',
    pattern: /\bsk_(?:live|test)_[0-9A-Za-z]{16,}\b/g,
  },
  {
    id: 'slack-token',
    description: 'Token de Slack incrustado',
    pattern: /\bxox(?:a|b|p|r|s)-[0-9A-Za-z-]{10,}\b/g,
  },
  {
    id: 'jwt-token',
    description: 'JWT incrustado',
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  },
  {
    id: 'literal-secret',
    description: 'Secreto asignado como texto literal',
    pattern:
      /\b(?:api[_-]?key|auth[_-]?token|access[_-]?token|client[_-]?secret|password|passwd|secret(?:[_-]?key)?)\b\s*[:=]\s*["'`]([^"'`\r\n]{8,})["'`]/gi,
    shouldReport: (match) => !obviousPlaceholders.test(match[1].trim()),
  },
];

async function collectRecursively(directory, files) {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }

  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;

    const entryPath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        await collectRecursively(entryPath, files);
      }
      continue;
    }

    if (entry.isFile() && scannableExtensions.has(extname(entry.name).toLowerCase())) {
      files.add(entryPath);
    }
  }
}

async function collectFiles() {
  const files = new Set();

  for (const sourceRoot of sourceRoots) {
    await collectRecursively(sourceRoot, files);
  }

  let rootEntries;
  try {
    rootEntries = await readdir(projectRoot, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  for (const entry of rootEntries) {
    if (
      entry.isFile() &&
      ['.htm', '.html'].includes(extname(entry.name).toLowerCase())
    ) {
      files.add(resolve(projectRoot, entry.name));
    }
  }

  return [...files].sort();
}

function lineNumberAt(source, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (source.charCodeAt(index) === 10) line += 1;
  }
  return line;
}

function inspectSource(filePath, source) {
  const findings = [];

  for (const rule of rules) {
    rule.pattern.lastIndex = 0;

    for (const match of source.matchAll(rule.pattern)) {
      if (rule.shouldReport && !rule.shouldReport(match)) continue;

      findings.push({
        description: rule.description,
        file: relative(projectRoot, filePath).replaceAll('\\', '/'),
        id: rule.id,
        line: lineNumberAt(source, match.index),
      });
    }
  }

  return findings;
}

async function main() {
  const files = await collectFiles();
  const findings = [];

  for (const filePath of files) {
    const source = await readFile(filePath, 'utf8');
    findings.push(...inspectSource(filePath, source));
  }

  if (findings.length > 0) {
    console.error(
      `Security check failed: ${findings.length} posible(s) problema(s) en ${files.length} archivo(s).`,
    );

    for (const finding of findings) {
      console.error(
        `- ${finding.file}:${finding.line} [${finding.id}] ${finding.description}`,
      );
    }

    process.exitCode = 1;
    return;
  }

  console.log(
    `Security check passed: ${files.length} archivo(s) revisado(s), sin patrones inseguros.`,
  );
}

main().catch((error) => {
  console.error('Security check could not complete.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
