/**
 * Phase execution types
 */

import { Blueprint } from './blueprint';
import { RunState } from './run';

// Phase execution context
export interface PhaseContext {
  run_id: string;
  tenant_id: string;
  env_id: string;
  blueprint: Blueprint;
  config: Record<string, unknown>;
  phase: number;
}

// Phase execution result
export interface PhaseResult {
  success: boolean;
  outputs: Record<string, unknown>;
  error?: string;
  artifacts: PhaseArtifact[];
  next_state: RunState;
  duration_ms: number;
}

// Phase artifact
export interface PhaseArtifact {
  type: string;
  content: unknown;
  hash?: string;
}

// Base phase executor interface
export interface PhaseExecutor {
  phase: number;
  name: string;
  execute(context: PhaseContext): Promise<PhaseResult>;
  isIdempotent(): boolean;
  canRetry(): boolean;
}

// Retry configuration
export interface RetryConfig {
  max_attempts: number;
  initial_delay_ms: number;
  max_delay_ms: number;
  multiplier: number;
  jitter: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  max_attempts: 3,
  initial_delay_ms: 1000,
  max_delay_ms: 30000,
  multiplier: 2,
  jitter: 0.1,
};
