# --- Build stage -----------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first, separately from copying source, so Docker's
# layer cache is reused whenever only application code changes (not
# package.json/package-lock.json) — meaningfully speeds up rebuilds.
COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

# Remove devDependencies (jest, nodemon, supertest, prisma CLI) now that
# Prisma Client has already been generated — the runtime stage never
# needs them, and copying them forward would bloat the final image for
# no benefit. Prisma Client itself lives in @prisma/client, a regular
# (non-dev) dependency, so it survives this prune.
RUN npm prune --omit=dev

# --- Runtime stage -----------------------------------------------------------
FROM node:20-alpine AS runtime

# bcrypt compiles native bindings at install time — the runtime image
# needs the same libc as the build stage produced binaries against.
# node:20-alpine's musl libc must match between stages, which it does
# here since both stages use the same base image.

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/package*.json ./

# Bootstrap/dev tools (seed-user.js, seed-notification.js, etc.) are
# deliberately excluded from the runtime image — they're one-off local
# tools, not part of the running application. If you ever need to run
# one inside a deployed container (e.g. bootstrapping the first
# SuperAdmin on a fresh production database), add:
#   COPY --from=builder /app/scripts ./scripts
# and `docker exec` into the running container to run it.

EXPOSE 4000

# Migrations are NOT run automatically on every container start — run
# them explicitly, once, as a separate command (see README's Docker
# section). This project has manual SQL history (the Booking exclusion
# constraint) that must be correctly captured in migration files, not
# silently skipped by an automatic deploy-on-boot script.
CMD ["node", "src/server.js"]
