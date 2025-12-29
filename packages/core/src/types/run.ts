/**
 * Run and state machine types
 */

// Run state machine enum
export enum RunState {
  PENDING = 'PENDING',
  LOCKED = 'LOCKED',
  VERIFIED = 'VERIFIED',
  POLICY_CHECK = 'POLICY_CHECK',
  PROVISIONING = 'PROVISIONING',
  READY_WAIT = 'READY_WAIT',
  TRAFFIC_SHIFT = 'TRAFFIC_SHIFT',
  OBSERVING = 'OBSERVING',
  DECISION_MADE = 'DECISION_MADE',
  EVIDENCE_STORED = 'EVIDENCE_STORED',
  COMPLETED = 'COMPLETED',
  ROLLED_BACK = 'ROLLED_BACK',
  FAILED = 'FAILED',
}

export enum PhaseStatus {
  STARTED = 'started',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export enum Decision {
  PROMOTE = 'promote',
  ROLLBACK = 'rollback',
  HOLD = 'hold',
}

// Run entity
export interface Run {
  run_id: string;
  tenant_id: string;
  env_id: string;
  blueprint_id: string;
  state: RunState;
  config: Record<string, unknown>;
  initiated_by: string | null;
  started_at: Date;
  completed_at: Date | null;
  decision: Decision | null;
  decision_reason: string | null;
  current_phase: number | null;
  lock_id: string | null;
}

// Phase event entity
export interface PhaseEvent {
  event_id: string;
  run_id: string;
  phase: number;
  status: PhaseStatus;
  timestamp: Date;
  duration_ms: number | null;
  outputs: Record<string, unknown>;
  error: string | null;
  artifact_refs: string[];
  signature: string | null;
}

// State transition rules
export const STATE_TRANSITIONS: Record<RunState, RunState[]> = {
  [RunState.PENDING]: [RunState.LOCKED, RunState.FAILED],
  [RunState.LOCKED]: [RunState.VERIFIED, RunState.FAILED],
  [RunState.VERIFIED]: [RunState.POLICY_CHECK, RunState.FAILED],
  [RunState.POLICY_CHECK]: [RunState.PROVISIONING, RunState.FAILED],
  [RunState.PROVISIONING]: [RunState.READY_WAIT, RunState.FAILED, RunState.ROLLED_BACK],
  [RunState.READY_WAIT]: [RunState.TRAFFIC_SHIFT, RunState.FAILED, RunState.ROLLED_BACK],
  [RunState.TRAFFIC_SHIFT]: [RunState.OBSERVING, RunState.FAILED, RunState.ROLLED_BACK],
  [RunState.OBSERVING]: [RunState.DECISION_MADE, RunState.FAILED, RunState.ROLLED_BACK],
  [RunState.DECISION_MADE]: [RunState.EVIDENCE_STORED, RunState.ROLLED_BACK],
  [RunState.EVIDENCE_STORED]: [RunState.COMPLETED, RunState.ROLLED_BACK],
  [RunState.COMPLETED]: [],
  [RunState.ROLLED_BACK]: [],
  [RunState.FAILED]: [],
};

export function isValidTransition(from: RunState, to: RunState): boolean {
  return STATE_TRANSITIONS[from]?.includes(to) ?? false;
}
