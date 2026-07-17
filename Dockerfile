FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# corepack off — this project uses npm (package-lock.json)


# =========================
# Stage 1: deps (full — includes devDependencies needed to build)
# =========================
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci


# =========================
# Stage 2: builder (next build)
# =========================
FROM base AS builder

ARG MONGODB_URI="mongodb://placeholder:27017/studentsync"
ARG NEXT_PUBLIC_APP_URL="http://localhost:3000"
ENV MONGODB_URI=${MONGODB_URI}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build


# =========================
# Stage 3: prod-deps (lean runtime deps — no devDependencies)
# `tsx` is a production dependency, so it survives --omit=dev.
# =========================
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev


# =========================
# Stage 4: runner (final image)
# =========================
FROM base AS runner
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Run as a non-root user
RUN groupadd -g 1001 nodejs \
  && useradd -u 1001 -g nodejs -m nextjs

# Only what the custom server needs at runtime.
# `--chown` sets ownership during COPY — doing it in a separate `RUN chown -R`
# would duplicate the large node_modules layer and roughly double the image.
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
# next.config.ts is TypeScript, so Next needs the `typescript` package present to
# load it — without this, the container tries to auto-install TS at boot.
COPY --from=deps      --chown=nextjs:nodejs /app/node_modules/typescript ./node_modules/typescript
COPY --from=builder   --chown=nextjs:nodejs /app/.next          ./.next
COPY --from=builder   --chown=nextjs:nodejs /app/public         ./public
COPY --from=builder   --chown=nextjs:nodejs /app/server.ts      ./server.ts
COPY --from=builder   --chown=nextjs:nodejs /app/next.config.ts ./next.config.ts
COPY --from=builder   --chown=nextjs:nodejs /app/tsconfig.json  ./tsconfig.json
COPY --from=builder   --chown=nextjs:nodejs /app/package.json   ./package.json

USER nextjs

EXPOSE 3000

# "Is the server accepting connections?" — resolves once server.ts is listening.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(()=>process.exit(0)).catch(()=>process.exit(1))"

# Start the custom Next + Socket.IO server (tsx is a prod dependency)
CMD ["node_modules/.bin/tsx", "server.ts"]
