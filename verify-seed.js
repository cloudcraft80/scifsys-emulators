const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'scifsys' });
const auth = admin.auth();
const db = admin.firestore();

async function main() {
    console.log('=== Seed Data Verification ===\n');

    // Auth users
    const users = await auth.listUsers(200);
    console.log('Auth emulator users: ' + users.users.length);
    const adminU = users.users.find(u => u.email === 'admin@test.local');
    if (adminU) {
        console.log('Admin user: ' + adminU.uid.substring(0, 16) + '...');
        console.log('  Claims: ' + JSON.stringify(adminU.customClaims));
    }

    // Firestore counts (REST-based to avoid gRPC)
    const http = require('http');
    const BASE = 'http://127.0.0.1:8080/v1/projects/scifsys/databases/(default)/documents';

    async function countColl(coll) {
        return new Promise((resolve) => {
            http.get(BASE + '/' + coll, (res) => {
                let d = '';
                res.on('data', c => d += c);
                res.on('end', () => {
                    try {
                        const j = JSON.parse(d);
                        resolve(j.documents ? j.documents.length : 0);
                    } catch { resolve(0); }
                });
            }).on('error', () => resolve(0));
        });
    }

    const collections = ['users', 'organizations', 'locations', 'commodityTypes', 'ships', 'builds', 'config'];
    console.log('\nFirestore collections (scifsys project):');
    let total = 0;
    for (const c of collections) {
        const n = await countColl(c);
        if (n > 0) console.log('  ' + c + ': ' + n);
        total += n;
    }
    console.log('Total: ' + total);
}

main().catch(e => console.error(e.message));
