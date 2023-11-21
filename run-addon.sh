#!/usr/bin/env ash

# exit on errors
set -e

npm run migrate
node src/scheduler/entrypoint.js
