/**
 * @cortexide/core
 *
 * Cortexide deterministic deployment orchestrator core library.
 * Exports: types, orchestrator, services, adapters.
 */

// Types
export * from './types/run';
export * from './types/phase';
export * from './types/lock';
export * from './types/evidence';
export * from './types/policy';
export * from './types/blueprint';
export * from './types/adapter';

// Orchestrator
export * from './orchestrator/state-machine';
export * from './orchestrator/phase-runner';

// Services
export * from './services/lock-service';
export * from './services/evidence-store';
export * from './services/policy-engine';

// Adapters
export * from './adapters/provider-adapter';
export * from './adapters/mock-adapter';
