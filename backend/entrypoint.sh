#!/bin/sh
set -e

echo "Running database migrations..."
pnpm exec prisma migrate deploy

echo "Seeding database..."
pnpm exec prisma db seed

echo "Starting backend server..."
exec pnpm dev
