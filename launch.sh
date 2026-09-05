#!/bin/bash
# scifsys-emulators.sh — Launch Firebase emulators for scifsys-beta using the actual repo

set -e

REPO_DIR="/home/super/Work/scifsys"
cd "$REPO_DIR"

export GOOGLE_APPLICATION_CREDENTIALS=/tmp/lumon-gcp-key.json
export FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
export FIREBASE_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080

echo "=== SCIFsys Firebase Emulator Suite ==="
echo "Project: scifsys-beta"
echo "Repo: $REPO_DIR"
echo ""

# Kill any existing emulator processes
pkill -f "cloud-firestore-emulator" 2>/dev/null || true
pkill -f "pubsub-emulator" 2>/dev/null || true
pkill -f "cloud-storage-rules" 2>/dev/null || true
pkill -f "firebase emulators:start" 2>/dev/null || true
sleep 2

firebase emulators:start \
  --project scifsys-beta \
  --only auth,firestore,functions,functions-beta,pubsub,storage,hosting,eventarc \
  --import /home/super/Work/scifsys-emulators/data-import 2>&1
