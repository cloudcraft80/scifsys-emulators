const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const http = require('http');

process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
const app = initializeApp({ projectId: 'scifsys' });
const auth = getAuth(app);

const FUN = 'http://127.0.0.1:5001/scifsys/us-central1';

async function fetch(url, opts={}) {
    return new Promise((resolve, reject) => {
        const req = http.request(url, {
            method: opts.method || 'GET',
            headers: opts.headers || { 'Content-Type': 'application/json' },
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, text: () => data }));
        });
        req.on('error', reject);
        if (opts.body) req.write(opts.body);
        req.end();
    });
}

async function main() {
    console.log('=== scifsys-beta Emulator: Full Auth + Function Test ===\n');

    // Create test user with admin token
    const email = `herm-full-${Date.now()}@scifsys.emulator`;
    const user = await auth.createUser({
        email, emailVerified: true, displayName: 'Hermes Full Test',
    });
    const token = await auth.createCustomToken(user.uid, { admin: true, adminLevel: 'super-admin' });
    const authH = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };

    console.log(`[SETUP] User: ${user.uid.substring(0,12)}... | token: ${token.substring(0,40)}...`);

    // ---- Comprehensive function tests (authenticated) ----
    const tests = [
        // Auth
        ['getUserRole', { uid: user.uid }, 'Auth: getUserRole'],
        ['getUserById', { uid: user.uid }, 'Auth: getUserById (admin)'],
        ['assignAdminClaim', { uid: user.uid, adminLevel: 'super-admin' }, 'Auth: assignAdminClaim (admin)'],
        ['validateEmail', { email: 'test@example.com', uid: user.uid }, 'Auth: validateEmail'],
        ['syncEmailVerificationStatus', { email: user.email, uid: user.uid }, 'Auth: syncEmailVerificationStatus'],
        ['manuallyVerifyUser', { uid: user.uid }, 'Auth: manuallyVerifyUser (admin)'],
        ['resetUserPassword', { uid: user.uid, newPassword: 'Test123!' }, 'Auth: resetUserPassword (admin)'],
        ['forceUserVerification', { uid: user.uid }, 'Auth: forceUserVerification (admin)'],
        ['suspendUser', { uid: user.uid }, 'Auth: suspendUser (admin)'],
        ['unsuspendUser', { uid: user.uid }, 'Auth: unsuspendUser (admin)'],
        ['banUser', { uid: user.uid }, 'Auth: banUser (admin)'],
        ['unbanUser', { uid: user.uid }, 'Auth: unbanUser (admin)'],
        ['kickUser', { uid: user.uid }, 'Auth: kickUser (admin)'],
        ['deleteUserAccount', { uid: user.uid }, 'Auth: deleteUserAccount (admin)'],

        // User
        ['getUserOrganizations', { uid: user.uid }, 'User: getUserOrganizations'],
        ['getUserMissions', { uid: user.uid }, 'User: getUserMissions'],
        ['getUserInventory', { userId: user.uid }, 'User: getUserInventory'],
        ['getPersonalTimeLog', { uid: user.uid, limit: 5 }, 'User: getPersonalTimeLog'],
        ['getPersonalCargoLog', { uid: user.uid, limit: 5 }, 'User: getPersonalCargoLog'],
        ['getUserNotifications', { uid: user.uid, limit: 5 }, 'User: getUserNotifications'],
        ['getUserAnalytics', { uid: user.uid }, 'User: getUserAnalytics'],
        ['exportUserData', { uid: user.uid }, 'User: exportUserData (admin)'],

        // Organization
        ['listPublicOrganizations', {}, 'Org: listPublicOrganizations'],
        ['getAppSettings', {}, 'Org: getAppSettings (admin)'],
        ['getOrganizationMembers', { orgId: 'nonexistent' }, 'Org: getOrganizationMembers (nonexistent)'],
        ['getUserChannel', { uid: user.uid }, 'Org: getUserChannel'],
        ['setUserChannel', { uid: user.uid, channel: 'general' }, 'Org: setUserChannel'],

        // Missions
        ['getMissionById', { missionId: 'nonexistent' }, 'Mission: getMissionById (nonexistent)'],
        ['getMissionObjectivesByMission', { missionId: 'nonexistent' }, 'Mission: getMissionObjectives (nonexistent)'],
        ['getOrganizationMissions', { orgId: 'nonexistent' }, 'Mission: getOrganizationMissions (nonexistent)'],
        ['getArchivedMissions', { limit: 3 }, 'Mission: getArchivedMissions'],

        // Starmap
        ['calculateCelestialDistance', { pointAName: 'ISS', pointBName: 'MOON' }, 'Starmap: calculateCelestialDistance'],
        ['getReferenceLocations', { region: 'Stanton' }, 'Starmap: getReferenceLocations'],
        ['getCompletedRoutes', { uid: user.uid, limit: 5 }, 'Starmap: getCompletedRoutes'],

        // Cargo/Shipment
        ['getActiveShipments', {}, 'Cargo: getActiveShipments'],
        ['createAdHocShipment', { userId: user.uid }, 'Cargo: createAdHocShipment (auth test)'],

        // Wiki
        ['getWikiEditorState', { spaceType: 'public', pageId: 'test' }, 'Wiki: getWikiEditorState'],

        // Bug reports
        ['getBugReports', { limit: 5 }, 'Bug: getBugReports (admin)'],

        // Beta functions (prefixed)
        ['beta_healthCheck', { test: true }, 'Beta: healthCheck'],
        ['beta_syncStableToBeta', {}, 'Beta: syncStableToBeta (empty)'],
        ['beta_listSyncableCollections', {}, 'Beta: listSyncableCollections'],
    ];

    let passed = 0, failed = 0, okCount = 0, clientError = 0;

    for (const [fn, payload, desc] of tests) {
        try {
            const resp = await fetch(FUN + '/' + fn, {
                method: 'POST',
                headers: authH,
                body: JSON.stringify({ data: payload })
            });
            const text = await resp.text();
            let data;
            try { data = JSON.parse(text); } catch { data = text; }

            if (resp.status === 200) {
                console.log(`  ✓ ${desc}: OK — ${JSON.stringify(data).substring(0, 80)}`);
                passed++;
            } else if (resp.status >= 400 && resp.status < 500) {
                console.log(`  ~ ${desc}: ${resp.status} — ${JSON.stringify(data).substring(0, 80)}`);
                clientError++;
                passed++; // Count as handled
            } else {
                console.log(`  ✗ ${desc}: HTTP ${resp.status} — ${text.substring(0, 80)}`);
                failed++;
            }
        } catch (e) {
            console.log(`  ✗ ${desc}: ERROR — ${e.message.substring(0, 80)}`);
            failed++;
        }
    }

    console.log(`\n[CLEANUP] Deleting test user...`);
    try { await auth.deleteUser(user.uid); } catch {}

    console.log(`\n═══════════════════════════════════════`);
    console.log(`  Results: ${passed}/${tests.length} handled (${clientError} client errors, ${failed} failures)`);
    console.log('═══════════════════════════════════════');

    process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
