import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
for (const file of readdirSync('web').filter(f => f.endsWith('.js'))) {
    const r = spawnSync(process.execPath, ['--check', 'web/' + file], { stdio: 'inherit' });
    if (r.status !== 0)
        process.exit(r.status ?? 1);
}
const html = readFileSync('web/index.html', 'utf8');
if (/\son\w+=|<script[^>]*>(?!\s*<\/script>)[^<]/i.test(html))
    throw new Error('Inline script or handler conflicts with the production Content Security Policy');
console.log('Browser modules: syntax and HTML entrypoint checks passed.');
