// Newline-delimited MCP stdio -> authenticated stateless HTTP bridge.
// stdout is reserved for protocol messages; never print the token.
import { createInterface } from 'node:readline';
const url = process.env.SMM_MCP_URL, token = process.env.SMM_API_TOKEN;
if (!url || !token)
    throw new Error('Set SMM_MCP_URL and SMM_API_TOKEN');
for await (const line of createInterface({ input: process.stdin, terminal: false })) {
    let request;
    try {
        request = JSON.parse(line);
        const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2025-11-25' }, body: line, signal: AbortSignal.timeout(120000) });
        if (r.status === 202)
            continue;
        if (!r.ok)
            throw new Error(`MCP HTTP ${r.status}`);
        process.stdout.write(JSON.stringify(await r.json()) + '\n');
    }
    catch (e) {
        if (request?.id !== undefined)
            process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: request.id, error: { code: -32603, message: e.message } }) + '\n');
        else
            process.stderr.write('MCP notification error\n');
    }
}
