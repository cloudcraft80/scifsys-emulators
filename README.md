# scifsys-emulators

Firebase emulator management scripts for the scifsys + scifsys-beta projects.

Cloned from: https://github.com/cloudcraft80/scifsys

## What's in here

Utility scripts for running, testing, and managing Firebase emulators locally for
development and QA against the scifsys codebase.

## Quick start

```bash
# Start emulators (kills existing, restarts fresh)
bash launch-beta.sh

# Smoke test functions
PATH=".../node/22.23.2/bin:$PATH" \
NODE_PATH=functions/node_modules \
node test-full-auth.js

# Check status
bash emulator-status.sh
```

## Requirements

- Firebase emulators v15.29.0+ (`npm install -g firebase-tools`)
- Node v22 (required for firebase-functions v7.3.2 compatibility)
- GCP service account key at `/tmp/lumon-gcp-key.json`

## Workspace layout

```
scifsys-emulators/
├── launch-beta.sh        # Start emulators (kills + restarts)
├── emulator-status.sh    # Health check script
├── merge-beta.sh         # Merge functions-beta into functions/ for single-emulator
├── test-*.js            # Smoke test scripts
└── README.md
```

The actual scifsys repo lives in the parent directory (`../scifsys/`).

## Emulator ports

| Service  | Port  |
|----------|-------|
| Auth     | 9099  |
| Firestore| 8080  |
| Functions| 5001  |
| Storage  | 9199  |
| Hub      | 4400  |
| PubSub   | 8085  |
| Eventarc | 9299  |

## Known issues

- Firestore gRPC blocked by emulator v1.22.0 — use REST API instead
- Auth `verifyIdToken` fails on emulator (emulator-specific limitation)
- PubSub requires `firebase init` to start
- Hosting requires `firebase login` (OAuth)
