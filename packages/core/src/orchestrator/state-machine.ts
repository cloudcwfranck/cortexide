/**
 * Run state machine
 */

import { RunState, STATE_TRANSITIONS } from '../types/run';

export class StateMachine {
  /**
   * Validate state transition
   */
  static validateTransition(from: RunState, to: RunState): void {
    const allowed = STATE_TRANSITIONS[from] || [];
    if (!allowed.includes(to)) {
      throw new Error(
        `Invalid state transition from ${from} to ${to}. Allowed transitions: ${allowed.join(', ')}`
      );
    }
  }

  /**
   * Get next state for successful phase
   */
  static getNextState(currentState: RunState, phase: number): RunState {
    const stateMap: Record<number, RunState> = {
      1: RunState.LOCKED,
      2: RunState.VERIFIED,
      3: RunState.POLICY_CHECK,
      4: RunState.PROVISIONING,
      5: RunState.READY_WAIT,
      6: RunState.TRAFFIC_SHIFT,
      7: RunState.OBSERVING,
      8: RunState.DECISION_MADE,
      9: RunState.EVIDENCE_STORED,
      10: RunState.COMPLETED,
    };

    const nextState = stateMap[phase];
    if (!nextState) {
      throw new Error(`Invalid phase number: ${phase}`);
    }

    this.validateTransition(currentState, nextState);
    return nextState;
  }

  /**
   * Get failure state
   */
  static getFailureState(currentState: RunState): RunState {
    // Before provisioning (Phase 4), failures go to FAILED
    const preProvisioningStates = [
      RunState.PENDING,
      RunState.LOCKED,
      RunState.VERIFIED,
      RunState.POLICY_CHECK,
    ];

    if (preProvisioningStates.includes(currentState)) {
      return RunState.FAILED;
    }

    // After provisioning, failures can trigger rollback or fail
    return RunState.FAILED;
  }

  /**
   * Check if state is terminal
   */
  static isTerminal(state: RunState): boolean {
    return [RunState.COMPLETED, RunState.ROLLED_BACK, RunState.FAILED].includes(state);
  }

  /**
   * Check if rollback is allowed from current state
   */
  static canRollback(state: RunState): boolean {
    const rollbackAllowed = [
      RunState.PROVISIONING,
      RunState.READY_WAIT,
      RunState.TRAFFIC_SHIFT,
      RunState.OBSERVING,
      RunState.DECISION_MADE,
      RunState.EVIDENCE_STORED,
    ];
    return rollbackAllowed.includes(state);
  }
}
