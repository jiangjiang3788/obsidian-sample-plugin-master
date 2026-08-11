import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const runtimeDir = path.join(root, 'src/features/settings/views/runtime');
const files = fs.readdirSync(runtimeDir).filter((name) => /^Energy.*\.tsx$/.test(name));
const failures = [];

for (const name of files) {
  const full = path.join(runtimeDir, name);
  const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    // JSX raw text does not interpret JavaScript unicode escapes. Catch the two forms that
    // caused literal "\\uXXXX" text in the UI while allowing escaped strings inside {...}.
    if (/>[^<{]*\\u[0-9a-fA-F]{4}/.test(line) || /}\s*\\u[0-9a-fA-F]{4}/.test(line)) {
      failures.push(`${name}:${index + 1}: raw JSX unicode escape`);
    }
  });
}

if (failures.length) {
  console.error('Energy UI Unicode gate failed:\n' + failures.join('\n'));
  process.exit(1);
}
console.log(`Energy UI Unicode gate passed (${files.length} Energy TSX files).`);
