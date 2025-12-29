# Cortexide

**Cloud-agnostic deterministic deployment control plane**

Cortexide is an enterprise-grade deployment orchestrator that wraps existing IaC tools (Terraform, Bicep, Pulumi) with:

- **Deterministic execution** (phases 1-10, auditable state machine)
- **Policy enforcement** (OPA/Rego gates)
- **Progressive delivery** (blue-green, canary, traffic shifting)
- **Evidence capture** (immutable audit trails)
- **Safe rollback** (circuit-breaker + manual triggers)

## Architecture

See [AGENTS.md](./AGENTS.md) for complete product specification.

## Repository Structure

```
cortexide/
├── apps/
│   └── api/              # REST API server (Fastify)
├── packages/
│   ├── core/             # Orchestrator + phase execution engine
│   └── cli/              # CLI (oclif)
├── examples/
│   └── mock-webapp/      # Example blueprint
└── docs/                 # Architecture docs
```

## Quick Start (v0.1)

### Prerequisites

- Node.js >= 18
- pnpm >= 8
- Docker + Docker Compose

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start infrastructure

```bash
docker compose up -d
```

### 3. Run migrations

```bash
pnpm db:migrate
```

### 4. Start services

```bash
pnpm dev
```

API server will be running on `http://localhost:3000`.

### 5. Run your first deployment

```bash
# Configure CLI
cd packages/cli
pnpm build
./bin/run init

# Execute a run
./bin/run run execute env_mock_dev
```

## Development

### Commands

```bash
# Install dependencies
pnpm install

# Start all services in dev mode
pnpm dev

# Run type checking
pnpm typecheck

# Run linter
pnpm lint

# Run tests
pnpm test

# Run all checks (typecheck + lint + test)
pnpm test:all

# Build all packages
pnpm build

# Clean build artifacts
pnpm clean
```

### Database

```bash
# Run migrations
pnpm db:migrate

# Seed test data
pnpm db:seed
```

### Docker

```bash
# Start Postgres + Redis
pnpm docker:up

# Stop services
pnpm docker:down

# View logs
pnpm docker:logs
```

## Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
cd packages/core && pnpm test:watch
```

### Integration Tests

Located in `apps/api/test/integration/`:

- `run-execute.test.ts` — Full run execution (phases 1-10)
- `rollback.test.ts` — Rollback behavior
- `lock-contention.test.ts` — Concurrent run handling
- `idempotency.test.ts` — Phase re-execution skipping

## v0.1 Scope

**Implemented:**
- ✅ Monorepo scaffolding
- 🚧 Database schema + migrations
- 🚧 Core orchestrator (PhaseRunner)
- 🚧 Lock service (DB + advisory locks)
- 🚧 Evidence store (local filesystem)
- 🚧 Mock adapter
- 🚧 Policy engine (OPA)
- 🚧 API server (4 endpoints)
- 🚧 CLI (4 commands)
- 🚧 Integration tests

**Deferred to v0.2+:**
- Real provider adapters (Azure, AWS, GCP)
- Multi-tenant API + RBAC
- Vault integration
- Web UI
- Signed evidence manifests

## License

Private. See [AGENTS.md](./AGENTS.md) section 21.

## Documentation

- [AGENTS.md](./AGENTS.md) — Product specification (source of truth)
- [docs/architecture.md](./docs/architecture.md) — System design
- [docs/phase-contracts.md](./docs/phase-contracts.md) — Phase 1-10 specs
- [docs/api-contract.md](./docs/api-contract.md) — REST API reference
- [docs/v0.1-quickstart.md](./docs/v0.1-quickstart.md) — Setup guide
