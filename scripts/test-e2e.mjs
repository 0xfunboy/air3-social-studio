import { readFileSync } from 'node:fs';

const envContent = readFileSync('.env', 'utf8');
const emailMatch = envContent.match(/BOOTSTRAP_EMAIL=(.+)/);
const passMatch = envContent.match(/BOOTSTRAP_PASSWORD=(.+)/);
const portMatch = envContent.match(/PORT=(\d+)/);

const email = emailMatch ? emailMatch[1].trim() : 'admin@localhost.test';
const password = passMatch ? passMatch[1].trim() : '';
const port = portMatch ? portMatch[1].trim() : '3100';
const BASE_URL = `http://127.0.0.1:${port}`;

console.log(`Testing AIR3 Social Studio at ${BASE_URL} with ${email}`);

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

async function run() {
    // 1. Healthz
    console.log('1. Checking /healthz...');
    const health = await req('/healthz');
    console.log('   Healthz:', health);

    // 2. Login
    console.log('2. Logging in...');
    const loginRes = await req('/api/login', 'POST', { email, password });
    csrfToken = loginRes.csrf;
    console.log('   Logged in as:', loginRes.user.email);
    console.log('   Workspaces:', loginRes.workspaces);

    // 3. Status
    console.log('3. Checking /api/status...');
    const status = await req('/api/status');
    console.log('   Status version:', status.version, 'Renderer:', status.renderer);

    // 4. List brands or create brand
    console.log('4. Managing brands...');
    let brands = await req('/api/brands');
    console.log(`   Found ${brands.length} existing brands`);
    let brand = brands[0];
    if (!brand) {
        console.log('   Creating new brand TechNova...');
        brand = await req('/api/brands', 'POST', {
            name: 'TechNova Studio',
            tagline: 'L’intelligenza artificiale al servizio del tuo brand',
            mission: 'Innovazione continua per il futuro',
            tone: ['Professionale', 'Visionario', 'Affidabile'],
            approvedClaims: ['Innovazione continua per il futuro', 'Controllo umano garantito'],
            bannedWords: ['garantito al 100%', 'miracoloso'],
            requiredPhrases: ['#TechNova'],
            colors: ['#1d4ed8', '#06b6d4', '#0b1329']
        });
        console.log('   Created brand:', brand.id, brand.data.name);
    } else {
        console.log('   Using brand:', brand.id, brand.data.name);
    }

    const brandId = brand.id;

    // 5. Add Knowledge Document
    console.log('5. Managing knowledge in brand...');
    let docs = await req(`/api/brands/${brandId}/knowledge`);
    let doc = docs[0];
    if (!doc) {
        doc = await req(`/api/brands/${brandId}/knowledge`, 'POST', {
            title: 'TechNova Mission and Products',
            text: `TechNova sviluppa soluzioni avanzate di orchestrazione AI per marketing e social media.
I nostri prodotti principali includono AIR3 Social Studio, una piattaforma open-source e self-hosted.
I valori fondamentali sono etica, trasparenza e controllo umano su ogni pubblicazione.`,
            scope: 'brand',
            roles: ['strategist', 'copywriter', 'reviewer']
        });
        console.log('   Added knowledge entity:', doc.id, 'revision:', doc.revision);

        const approvedDoc = await req(`/api/knowledge/${doc.id}/approve`, 'POST', {
            revision: doc.revision,
            approved: true
        });
        console.log('   Knowledge approved:', approvedDoc.data.approved);
    } else {
        console.log('   Using existing knowledge entity:', doc.id);
    }

    // 6. Test RAG retrieval
    console.log('6. Testing RAG retrieval...');
    const ragResults = await req(`/api/brands/${brandId}/rag`, 'POST', {
        query: 'valori fondamentali ed etica',
        role: 'copywriter',
        platform: 'telegram'
    });
    console.log(`   RAG mode: ${ragResults.mode}, returned ${ragResults.hits?.length} hits`);

    // 7. Test Media Template Rendering (FFmpeg JPEG creation)
    console.log('7. Testing Media Template (FFmpeg JPEG)...');
    const mediaRes = await req(`/api/brands/${brandId}/render`, 'POST', {
        headline: 'Il Futuro dell’Intelligenza Artificiale',
        body: 'AIR3 Social Studio unisce il controllo editoriale umano all’automazione intelligente.'
    });
    console.log('   Media template rendered successfully:', mediaRes.id, mediaRes.data?.mime, mediaRes.data?.url);

    // 8. Connect / Save an Account (e.g. Telegram channel)
    console.log('8. Creating social account channel...');
    let accounts = await req(`/api/brands/${brandId}/accounts`);
    let account = accounts[0];
    if (!account) {
        account = await req(`/api/brands/${brandId}/accounts`, 'POST', {
            name: 'TechNova Telegram',
            platform: 'telegram',
            transport: 'direct',
            targetId: '-1001234567890',
            credentials: {
                botToken: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz123456789'
            }
        });
        console.log('   Account created:', account.id, account.data.name);
    } else {
        console.log('   Using account:', account.id, account.data.name);
    }

    // 9. Create Content Draft
    console.log('9. Creating content draft...');
    const draft = await req(`/api/brands/${brandId}/contents`, 'POST', {
        accountId: account.id,
        title: 'Lancio AIR3 Social Studio',
        objective: 'Annunciare la release con focus su privacy e self-hosting',
        format: 'image',
        text: 'Siamo entusiasti di presentare AIR3 Social Studio: AI grounded, approvazione umana e pieno controllo dei tuoi dati. 🚀 #TechNova',
        media: [
            {
                id: mediaRes.id,
                alt: 'AIR3 Social Studio Launch Cover'
            }
        ],
        options: {
            consent: true
        }
    });
    console.log('   Created draft post:', draft.id, 'lifecycle:', draft.data.lifecycle, 'rev:', draft.revision);

    // 10. Review post
    console.log('10. Reviewing post...');
    const reviewRes = await req(`/api/contents/${draft.id}/review`, 'POST');
    console.log('    Review complete! Post lifecycle:', reviewRes.data?.lifecycle, 'Score:', reviewRes.data?.review?.score);

    // 11. Approve post
    console.log('11. Approving post...');
    const approvedPost = await req(`/api/contents/${draft.id}/approve`, 'POST', {
        revision: reviewRes.revision,
        visualConfirmed: true,
        reason: 'Approvazione manuale editoriale confermata'
    });
    console.log('    Post approved! Status:', approvedPost.data.status);

    // 12. Schedule post
    console.log('12. Scheduling post...');
    const scheduleTime = new Date(Date.now() + 3600000).toISOString();
    const scheduledPost = await req(`/api/contents/${draft.id}/schedule`, 'POST', {
        revision: approvedPost.revision,
        at: scheduleTime
    });
    console.log('    Post scheduled for:', scheduledPost.data.scheduleAt, 'Status:', scheduledPost.data.status);

    // 13. Check queue, jobs, audit
    console.log('13. Checking jobs and audit logs...');
    const jobs = await req(`/api/brands/${brandId}/jobs`);
    console.log(`    Scheduled jobs in queue: ${jobs.length}`);

    const audit = await req(`/api/brands/${brandId}/audit`);
    console.log(`    Audit log records: ${audit.length}`);

    console.log('\n========================================');
    console.log('🎉 ALL END-TO-END WORKFLOWS PASSED 100%!');
    console.log('========================================\n');
}

run().catch(err => {
    console.error('❌ E2E test failed:', err);
    process.exit(1);
});
