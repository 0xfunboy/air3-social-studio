import { readFileSync } from 'node:fs';

const envContent = readFileSync('.env', 'utf8');
const emailMatch = envContent.match(/BOOTSTRAP_EMAIL=(.+)/);
const passMatch = envContent.match(/BOOTSTRAP_PASSWORD=(.+)/);
const portMatch = envContent.match(/PORT=(\d+)/);

const email = emailMatch ? emailMatch[1].trim() : 'admin@localhost.test';
const password = passMatch ? passMatch[1].trim() : '';
const port = portMatch ? portMatch[1].trim() : '3100';
const BASE_URL = `http://127.0.0.1:${port}`;

let cookie = '';
let csrfToken = '';

async function req(path, method = 'GET', body = null) {
    const headers = {};
    if (cookie) headers['Cookie'] = cookie;
    if (csrfToken && method !== 'GET' && method !== 'HEAD') headers['X-CSRF-Token'] = csrfToken;
    if (body) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
        cookie = setCookie.split(';')[0];
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(`${method} ${path} failed with ${res.status}: ${JSON.stringify(data)}`);
    }
    return data;
}

async function test() {
    console.log('Testing AI generation in AIR3 Social Studio...');
    const loginRes = await req('/api/login', 'POST', { email, password });
    csrfToken = loginRes.csrf;

    const brands = await req('/api/brands');
    const brand = brands[0];
    if (!brand) throw new Error('No brand found');
    const brandId = brand.id;

    const accounts = await req(`/api/brands/${brandId}/accounts`);
    const account = accounts[0];
    if (!account) throw new Error('No account found');

    console.log('1. Creating a draft with AI prompt objective...');
    const draft = await req(`/api/brands/${brandId}/contents`, 'POST', {
        accountId: account.id,
        title: 'Post su AI Governance e Sicurezza',
        objective: 'Spiegare in 3 punti chiave perché il controllo editoriale umano è fondamentale nell’era dei modelli generativi',
        format: 'text',
        text: ''
    });
    console.log('   Draft created:', draft.id, 'rev:', draft.revision);

    console.log('2. Triggering AI generation (Strategist + Copywriter + Reviewer)...');
    const genJob = await req(`/api/contents/${draft.id}/generate`, 'POST', {
        revision: draft.revision,
        mode: 'all'
    });
    console.log('   Generation job enqueued:', genJob);

    console.log('3. Waiting for worker to complete generation...');
    let post;
    for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        post = await req(`/api/contents/${draft.id}`);
        console.log(`   [${i+1}] Status: ${post.data.status}, text length: ${post.data.text.length}`);
        if (post.data.text && post.data.text.length > 20) {
            break;
        }
    }

    console.log('\n--- Generated Post by AIR3 AI Agent Pipeline ---');
    console.log('Title:', post.data.title);
    console.log('Text:\n', post.data.text);
    console.log('Hashtags:', post.data.hashtags);
    console.log('Review score:', post.data.review?.score);
    console.log('Status:', post.data.status);
    console.log('------------------------------------------------\n');
}

test().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
