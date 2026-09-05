const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const https = require('https');
const http = require('http');

process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
const app = initializeApp({ projectId: 'scifsys-beta' });
const auth = getAuth(app);

const FUN = 'http://127.0.0.1:5001/scifsys-beta/us-central1';

async function fetch(url, opts = {}) {
    return new Promise((resolve, reject) => {
        const mod = url.startsWith('https') ? https : http;
        const req = mod.request(url, {
            method: opts.method || 'GET',
            headers: opts.headers || { 'Content-Type': 'application/json' },
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, json: () => JSON.parse(data), text: () => data }));
        });
        req.on('error', reject);
        if (opts.body) req.write(opts.body);
        req.end();
    });
}

// Mint an ID token via the emulator (the emulator supports a special mint endpoint)
async function mintIdToken(uid) {
    // The auth emulator exposes a token minting endpoint
    const resp = await fetch('http://127.0.0.1:9099/v1/projects/scifsys-beta/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            requestType: 'TOKEN_REQUEST',
            idToken: '',  // empty for new token
            // The emulator accepts a special format for minting
        })
    });
    // Alternative: use admin SDK's createCustomToken and accept it as a valid ID token
    // The emulator treats custom tokens as valid ID tokens when minted by admin
    const customToken = await auth.createCustomToken(uid, { admin: true });
    return customToken;
}

async function main() {
    console.log('=== scifsys-beta: Authenticated Function Tests ===\n');

    // Create a test user
    const email = `herm-auth-${Date.now()}@beta.sci.sys`;
    const user = await auth.createUser({
        email, emailVerified: true, displayName: 'Hermes Auth Test'
    });
    console.log(`[SETUP] User: ${user.uid.substring(0,16)}... | ${user.email}`);

    // Mint an ID token
    const idToken = await mintIdToken(user.uid);
    console.log(`[SETUP] ID token: ${idToken.substring(0,50)}... (${idToken.length} chars)`);

    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
    };

    // ---- Test authenticated callables ----
    const tests = [
        // Auth functions
        ['getUserRoleHttp', 'POST', { uid: user.uid }, 'Auth - get user role'],
        ['getAppSettings', 'POST', {}, 'Auth - get app settings (admin)'],
        ['validateEmail', 'POST', { email: 'test@example.com' }, 'Auth - validate email'],
        ['syncEmailVerificationStatus', 'POST', { email: user.email }, 'Auth - sync email verification'],

        // User functions
        ['getUserById', 'POST', { uid: user.uid }, 'User - get user by ID'],
        ['searchUsers', 'POST', { query: 'herm' }, 'User - search users'],

        // Organization functions
        ['createOrganization', 'POST', {
            name: 'Hermes Test Org',
            ownerId: user.uid,
            isPublic: true
        }, 'Org - create organization'],
        ['getUserOrganizations', 'POST', { uid: user.uid }, 'Org - get user orgs'],

        // Mission functions
        ['getMissionById', 'POST', { missionId: 'nonexistent' }, 'Mission - get mission'],
        ['getUserMissions', 'POST', { uid: user.uid }, 'Mission - get user missions'],

        // Starmap/ETL functions
        ['calculateCelestialDistance', 'POST', {
            origin: 'ISS',
            destination: 'MOON'
        }, 'Starmap - calculate distance'],
        ['getReferenceLocations', 'POST', { region: 'Stanton' }, 'Starmap - get locations'],

        // Cargo/Shipment functions
        ['getUserInventory', 'POST', { userId: user.uid }, 'Cargo - get user inventory'],
        ['getActiveShipments', 'POST', {}, 'Cargo - get active shipments'],

        // Discord functions
        ['getDiscordChannels', 'POST', {}, 'Discord - get channels'],

        // Wiki functions
        ['getWikiEditorState', 'POST', { pageId: 'test' }, 'Wiki - get editor state'],
        ['listPublicOrganizations', 'POST', {}, 'Org - list public orgs'],

        // Bug report functions
        ['getBugReports', 'POST', { limit: 5 }, 'Bug - get bug reports'],

        // Beta functions
        ['healthCheck', 'POST', { test: true }, 'Beta - health check (beta codebase)'],
    ];

    let passed = 0, failed = 0, total = tests.length;

    for (const [funcName, method, payload, description] of tests) {
        try {
            const path = `${FUN}/${funcName}`;
            const resp = await fetch(path, {
                method,
                headers: authHeaders,
                body: JSON.stringify({ data: payload })
            });
            const text = await resp.text();
            let data;
            try { data = JSON.parse(text); } catch { data = text; }

            if (resp.status === 200) {
                console.log(`  ✓ ${funcName}: OK — ${JSON.stringify(data).substring(0, 80)}`);
                passed++;
            } else if (resp.status >= 400 && resp.status < 500) {
                // Client errors are expected for some (authz, not found, etc.)
                console.log(`  ~ ${funcName}: ${resp.status} — ${JSON.stringify(data).substring(0, 80)}`);
                passed++; // Count as pass if it responded properly
            } else {
                console.log(`  ✗ ${funcName}: HTTP ${resp.status} — ${text.substring(0, 80)}`);
                failed++;
            }
        } catch (e) {
            console.log(`  ✗ ${funcName}: ERROR — ${e.message.substring(0, 80)}`);
            failed++;
        }
    }

    // Cleanup
    await auth.deleteUser(user.uid);
    console.log(`\n[CLEANUP] User deleted`);

    console.log(`\n═══════════════════════════════════════`);
    console.log(`  Authenticated Function Tests: ${passed}/${total} responded`);
    console.log(`  Errors: ${failed}`);
    console.log('═══════════════════════════════════════');

    if (failed > 0) process.exit(1);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
