set dotenv-filename := ".env.local"

# Start dev server
dev:
    bun dev

# Production build
build:
    bun run build

# Run ESLint
lint:
    bun run lint

# Generate migrations from schema changes
db-generate:
    bunx drizzle-kit generate

# Apply pending migrations
db-migrate:
    bunx drizzle-kit migrate

# Seed database with sample data
db-seed:
    bun run src/db/seed.ts

# Open Drizzle Studio (DB browser)
db-studio:
    bunx drizzle-kit studio
