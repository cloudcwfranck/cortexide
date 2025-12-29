# AGENTS.md — Cortexide
Product: **cortexide**
Domain: **cortexide.com** (Vercel)
Goal: Cloud-agnostic, enterprise-grade **deterministic deployment orchestrator** for **green / blue-green / canary** across mixed workloads (Windows + Linux VMs, APIs, AADDS/ADDS, Functions, Logic Apps, VNET/VPC, DBs, queues, etc.) with **policy compliance, evidence, and safe automation**.

---

## 0) North Star
Cortexide is a **deployment control plane** that:
1) Locks an environment
2) Verifies current state
3) Confirms policy compliance
4) Provisions / updates resources
5) Waits for readiness
6) Shifts traffic incrementally
7) Observes metrics
8) Makes deterministic decision
9) Persists evidence
10) Releases lock

**Cortexide is not “an AI that deploys.”** It is a deterministic engine that can *use* AI to speed up planning and authoring, while the actual execution stays **auditable, repeatable, policy-gated, and reversible**.

---

## 1) Is this achievable?
Yes, if you treat it as **(a) a deterministic workflow engine + (b) provider adapters + (c) policy/evidence system + (d) optional AI copilot**.

### Achievable scenario (mixed workload)
**Scenario: “Payments Platform Blue-Green on Azure, later AWS”**
- Current: Azure hub-and-spoke VNET, AADDS/ADDS, Windows IIS VMs, Linux API VMs, Azure Functions, Logic Apps, App Gateway, Private Endpoints, Key Vault, Monitor.
- Target: Blue-Green for API tier + Functions, with gated traffic shift and rollback.
- Cortexide run:
  - Lock environment `prod-payments`
  - Snapshot current infra state + drift check
  - Evaluate policies (network rules, tags, encryption, identity)
  - Provision Green: new VMSS/VM sets + Functions slot + Logic Apps version, update route tables/private endpoints as required
  - Wait: health endpoints, domain join checks, function warmup, queue connectivity
  - Shift traffic: 10% → 25% → 50% → 100% via App Gateway rules or DNS weight
  - Observe: p95 latency, error rate, queue depth, auth failures
  - Decision: promote or rollback, based on deterministic thresholds
  - Persist evidence: signed run manifest, policies passed, diffs, metrics, approvals
  - Unlock environment

**Why enterprises will trust it:** it behaves like a strict flight controller, not a creative assistant.

---

## 2) Product shape
### UX
- **CLI-first** (automation + CI/CD), **GUI-optional** (Vercel web console) over the same API.
- Users can:
  - select a provider and workload blueprint
  - configure environment variables and policies
  - run a deployment (dry-run, plan, execute)
  - see a timeline, gates, evidence, and rollback controls

### Mental model
- **Catalog → Blueprint → Environment → Run**
  - Catalog: cloud components (Compute/Network/Identity/etc.)
  - Blueprint: opinionated stacks (“3-tier web”, “AKS/EKS”, “VM + App Gateway”, “ADDS + VMs”)
  - Environment: dev/qa/stage/prod instances of a blueprint
  - Run: an immutable deployment execution with evidence

---

## 3) Architecture (enterprise-grade)
### 3.1 Control Plane (Cortexide Core)
- **Orchestrator**: deterministic state machine; runs phases 1–10
- **Run Ledger**: append-only run events (WORM option)
- **Policy Engine**: OPA/Rego (or Cedar later) for compliance gates
- **Evidence Store**: structured artifacts + optional signatures (Cosign/Sigstore style)
- **Lock Service**: distributed lock + lease + deadman release
- **Secrets**: Vault (recommended) + cloud native (Key Vault / Secrets Manager / GCP Secret Manager)
- **Identity**: OIDC SSO for UI + workload identity for execution

### 3.2 Execution Plane (Connectors)
Provider adapters execute actions:
- **Azure Adapter**: ARM/Bicep/Terraform/Pulumi driver + traffic manager (App Gateway/Front Door/DNS)
- **AWS Adapter**: CloudFormation/Terraform/Pulumi + ALB/Route53 weights
- **GCP Adapter**: Deployment Manager/Terraform + LB/DNS

**Important:** Cortexide does not reinvent IaC; it **orchestrates** it and adds **locks, policy gates, progressive delivery, evidence**.

### 3.3 Isolation and multi-tenant data protection
- **Tenant isolation**:
  - Each tenant has its own encryption key (KMS/Vault Transit).
  - Row-level security (RLS) enforced by tenant_id on every query.
  - Separate object storage prefix per tenant; optional dedicated bucket per tenant.
  - Audit logs immutable and tenant-scoped.
- **Execution isolation**:
  - Runs execute in isolated workers (per-tenant queue + ephemeral container).
  - No cross-tenant cache sharing.
  - Provider credentials scoped per environment; never shared across tenants.

---

## 4) Deterministic phases (the contract)
Each phase MUST:
- have clear inputs
- produce outputs
- be idempotent
- emit signed events
- have explicit failure modes & rollback steps

### Phase 1 — Lock Environment
- Acquire lock: `{tenant, env, run_id, ttl}`
- Fail if locked; allow admin override with audit reason

### Phase 2 — Verify Current State
- Gather: IaC state, cloud inventory, drift detection
- Output: `state_snapshot.json`

### Phase 3 — Confirm Policy Compliance
- Evaluate OPA policies on:
  - desired plan
  - current state
  - deltas
- Output: `policy_report.json` (pass/fail + reasons)

### Phase 4 — Provision Resources
- Apply plan using adapter driver:
  - terraform plan/apply OR bicep deployment OR pulumi up
- Output: `apply_report.json` (resource IDs, diffs)

### Phase 5 — Wait for Readiness
- Health checks:
  - VM: WinRM/SSH ready, domain join, service healthy
  - API: /healthz, DB connectivity
  - Functions: warm invocation
- Output: `readiness_report.json`

### Phase 6 — Shift Traffic Incrementally
- Progressive steps: e.g. 10/25/50/100
- Adapter handles:
  - App Gateway rules / Front Door / ALB weights / DNS weighted records
- Output: `traffic_shift.json`

### Phase 7 — Observe Metrics
- Pull metrics from provider + app telemetry:
  - error_rate, latency_p95, saturation, auth_failures, queue_depth
- Output: `metrics_window.json`

### Phase 8 — Make Deterministic Decision
- Deterministic rules:
  - e.g. error_rate < 1%, p95 < 300ms, auth_failures stable
- Output: `decision.json` (promote/hold/rollback) + rule evaluations

### Phase 9 — Persist Evidence
- Store artifacts + sign manifest:
  - run_manifest.json (hashes of all artifacts)
- Output: `evidence_receipt.json`

### Phase 10 — Release Lock
- Release lock unless “hold for investigation” with approval

---

## 5) Where AI fits (and where it does NOT)
### AI allowed (assistive, non-authoritative)
- Convert intent → draft blueprint
- Suggest policy rules (OPA) based on standards
- Explain diffs, propose rollback strategy
- Generate docs/tests, create initial component mappings

### AI NOT allowed (authoritative execution)
- AI must never directly apply changes without:
  - deterministic plan generated by engine
  - policy gates passed
  - explicit approval (where required)
  - full evidence capture

**Implementation rule:** AI can propose. Cortexide decides.

---

## 6) CLI + GUI compatibility
### Single API, two clients
- CLI uses the same endpoints as the web UI.
- CLI supports:
  - `cortexide init`
  - `cortexide catalog sync`
  - `cortexide blueprint create`
  - `cortexide env create`
  - `cortexide run plan`
  - `cortexide run execute`
  - `cortexide run rollback`
  - `cortexide evidence fetch`

GUI (Vercel) supports:
- sign-in (SSO)
- catalog browsing
- blueprint editor
- run timeline + evidence viewer
- approvals (RBAC)

---

## 7) Catalog strategy (staying updated with cloud providers)
### “Catalog” design
- Canonical component model:
  - `Compute`, `Network`, `Identity`, `Storage`, `Observability`, `Delivery`
- Provider-specific implementations:
  - AzureCompute.VM, AzureCompute.VMSS, AWSCompute.EC2, etc.
- Each component has:
  - schema (inputs/outputs)
  - capabilities
  - policy hooks
  - drift signals
  - test harness

### Update mechanism
- Use **versioned catalog releases**:
  - `catalog@2026.01` etc.
- Sync sources:
  - provider APIs + official docs scraping is optional; start with **manual curated** + automated tests.
- Safety rule:
  - new catalog entries must pass conformance tests before publishing.

**Why:** full automatic “discover every new SKU” is noisy. Enterprise-grade demands stable, tested, versioned catalogs.

---

## 8) Secrets management (enterprise)
### Recommended default
- **HashiCorp Vault** (Transit + KV) for:
  - tenant keying
  - secret rotation
  - dynamic cloud creds (where possible)

### Supported alternatives (per provider)
- Azure Key Vault
- AWS Secrets Manager + KMS
- GCP Secret Manager + KMS

### Mandatory security controls
- Secrets never stored in plaintext
- Per-tenant encryption keys
- Short-lived tokens for execution workers
- Audit log for secret access

---

## 9) Codex vs Claude Code (recommendation)
Use **both** intentionally:
- **Codex**: strongest for repo-scale code edits, refactors, implementing endpoints, tests, CI, and repetitive scaffolding.
- **Claude Code**: often excellent at high-level architecture reasoning, threat modeling, and producing coherent multi-file designs.

**Practical approach:** Claude Code drafts architecture + contracts; Codex implements to spec with tests.  
(If you must pick one: pick the one that integrates best into your workflow/IDE and that reliably runs tests after edits.)

---

## 10) How people start using Cortexide (adoption path)
### Day 1 (single team)
- Install CLI
- Choose provider (Azure)
- Import an existing Terraform/Bicep stack
- Add policies + traffic strategy
- Run `plan` and `execute` in dev

### Day 30 (multi-team)
- Add RBAC and approvals
- Add evidence retention and export for audit
- Standardize blueprints for platform teams

### Day 90 (enterprise)
- Multi-tenant SaaS or self-hosted
- Dedicated worker pools per BU
- Conformance catalog releases + governance

---

## 11) Repo plan (monorepo)
Root:
- `/apps/web` — Next.js (Vercel) UI for cortexide.com
- `/apps/api` — API server (Node/TypeScript)
- `/apps/worker` — execution workers (Node/TypeScript or Go later)
- `/packages/cli` — CLI (Node/TS with oclif or Go cobra)
- `/packages/core` — orchestrator state machine + phase contracts
- `/packages/policy` — OPA policy bundles + test fixtures
- `/packages/catalog` — component schemas + adapters mapping
- `/infra` — deploy configs for hosted control plane (minimal)
- `/docs` — architecture, blueprints, runbooks
- `/examples` — sample blueprints (Azure mixed workload, AWS web, etc.)

---

## 12) Tech choices (v1)
- Language: TypeScript everywhere (fast iteration)
- DB: Postgres (RLS for tenancy)
- Queue: Redis + BullMQ (or Postgres-based job queue to start)
- Object store: S3-compatible (or provider-specific) for artifacts
- Policy: OPA (rego) with unit tests
- Auth: NextAuth + OIDC; API uses JWT + RBAC
- Observability: OpenTelemetry

---

## 13) Deterministic interfaces (must implement)
### 13.1 Blueprint Schema (JSON)
- name, version
- provider targets
- components list
- traffic strategy
- readiness checks
- policies required
- evidence requirements

### 13.2 Run Manifest
- run_id, tenant_id, env_id
- phase events with hashes
- artifact pointers
- decision and rollback link

### 13.3 Adapter Contract
- `plan(blueprint, env)`
- `apply(plan)`
- `wait(readiness)`
- `shiftTraffic(strategyStep)`
- `collectMetrics(window)`
- `rollback(run_id, target_state)`

All must be deterministic and testable with mocked providers.

---

## 14) CI/CD rules (non-negotiable)
- Every PR must:
  - typecheck
  - lint
  - unit tests
  - policy tests
  - contract tests (adapter interface)
- “Golden runs” in `/examples`:
  - `dry-run` must always succeed offline (mocks)
- Release artifacts:
  - CLI binary build
  - catalog version publish
  - web deploy (Vercel)

---

## 15) Roadmap (360°, deterministic milestones)
### v0.1 — Skeleton (2–3 weeks)
Deliverables:
- Orchestrator with phases 1–10 (mock adapter)
- Run ledger + evidence store (local)
- CLI: init, plan, execute (mock)
Acceptance:
- Deterministic run produces evidence manifest and replays

### v0.2 — Azure MVP (4–6 weeks)
Deliverables:
- Azure adapter: Terraform/Bicep driver
- Traffic shift: App Gateway or Front Door
- Readiness: VM + Functions + basic API health
- Policy bundle: tagging + encryption + private networking baseline
Acceptance:
- Blue-green deployment of sample “mixed workload” blueprint in Azure

### v0.3 — Enterprise controls (4–6 weeks)
Deliverables:
- Multi-tenant API + RLS
- RBAC + approvals
- Vault integration
- Evidence export (zip + signed manifest)
Acceptance:
- Two tenants cannot access each other’s runs/evidence; audit-ready export

### v0.4 — AWS adapter (4–6 weeks)
Deliverables:
- AWS adapter + traffic shift (ALB/Route53)
- Catalog v2 with provider mapping
Acceptance:
- Same blueprint pattern deploys on Azure and AWS (provider-specific implementation)

### v0.5 — GUI Console (4–8 weeks)
Deliverables:
- Web UI: catalog browser, blueprint editor, run timeline, approvals
Acceptance:
- GUI can run the same operations as CLI, no hidden behaviors

### v1.0 — Hardening (ongoing)
Deliverables:
- Conformance tests for catalog releases
- SLOs, rate limiting, incident runbooks
- Self-hosted option packaging
Acceptance:
- Documented operational model; reproducible installs

---

## 16) Exact “AI execution rules” (for Codex / Claude Code)
When implementing, the AI MUST:
1. Implement phase contracts exactly as defined in section 4.
2. Never introduce hidden side effects in the web UI; UI calls API only.
3. Write tests before or alongside features:
   - orchestrator determinism tests
   - adapter contract tests
   - policy unit tests
4. Use feature flags for anything non-deterministic or experimental.
5. Provide a runnable local dev experience:
   - `docker compose up` starts db/redis/opa (if needed)
   - `pnpm dev` starts web+api+worker
6. Provide a single command to run full checks:
   - `pnpm test:all`

---

## 17) Local development (target commands)
- `pnpm i`
- `docker compose up -d`
- `pnpm dev`
- `pnpm test:all`

---

## 18) Definition of Done (per milestone)
- All tests green
- Deterministic replay of a run produces identical manifest hashes
- Evidence artifacts are immutable and tenant-scoped
- Secrets never appear in logs or run artifacts
- Rollback path exists for any traffic shift step

---

## 19) Initial deliverable set (what to build first)
1) Orchestrator core + phase eventing
2) Evidence store + signed manifest
3) Lock service (DB-based lease)
4) Mock adapter + example blueprint
5) CLI (plan/execute/replay)
6) Policy engine (OPA) with baseline bundle
7) Azure adapter MVP (Bicep or Terraform driver)

---

## 20) Naming conventions
- Tenants: `t_<slug>`
- Environments: `env_<name>_<region>`
- Runs: `run_<timestamp>_<shortid>`
- Catalog versions: `catalog_<yyyy.mm>`

---

## 21) License & posture
- Default: private repo until v0.5
- Security: threat model in `/docs/security/threat-model.md`
- Compliance: evidence-first design (audit export is a first-class feature)

---

END OF AGENTS.md
