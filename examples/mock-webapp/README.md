# Mock Web App Blueprint

Example blueprint for Cortexide demonstrating canary deployment with traffic shifting.

## Components

- **web-vm-pool**: VMSS with 2 instances (Ubuntu 20.04)
- **load-balancer**: Load balancer with `/healthz` probe

## Traffic Strategy

Canary deployment with progressive rollout:
- 10% → 25% → 50% → 100%
- 5-minute soak period between steps

## Decision Rules

Automatic rollback if:
- Error rate > 1%
- p95 latency > 300ms

## Usage

```bash
# Create environment
cortexide env create env_mock_dev --blueprint mock-webapp --region local

# Execute deployment
cortexide run execute env_mock_dev

# Check status
cortexide run status <run_id>

# Fetch evidence
cortexide evidence fetch <run_id>
```
