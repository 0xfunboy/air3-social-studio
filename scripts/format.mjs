import ts from 'typescript';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
async function format(path) {
    const code = await readFile(path, 'utf8');
    const file = ts.createSourceFile(path, code, ts.ScriptTarget.Latest, true, path.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS);
    await writeFile(path, printer.printFile(file));
}
async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory())
            await walk(path);
        else if (/\.(ts|js|mjs)$/.test(entry.name))
            await format(path);
    }
}
for (const directory of ['src', 'tests', 'web', 'scripts'])
    await walk(directory);
for (const path of ['main.ts', 'cli.ts'])
    await format(path);
console.log('TypeScript / JavaScript formatted.');
