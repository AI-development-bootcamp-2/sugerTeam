#!/bin/sh
set -e

echo "Pushing Prisma schema to database..."
pnpm exec prisma db push --skip-generate

echo "Starting backend server..."
exec pnpm dev
