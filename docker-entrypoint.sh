#!/bin/sh
set -e

# Ensure persistent directories have proper ownership and write permissions for nextjs user
mkdir -p /app/public/uploads /app/prisma
chown -R nextjs:nodejs /app/public/uploads /app/prisma 2>/dev/null || true
chmod -R 775 /app/public/uploads /app/prisma 2>/dev/null || true

# Execute main process as nextjs user
exec su-exec nextjs "$@"
