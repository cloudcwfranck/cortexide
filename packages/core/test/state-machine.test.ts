/**
 * State machine tests
 */

import { StateMachine } from '../src/orchestrator/state-machine';
import { RunState } from '../src/types/run';

describe('StateMachine', () => {
  describe('validateTransition', () => {
    it('should allow valid transitions', () => {
      expect(() => {
        StateMachine.validateTransition(RunState.PENDING, RunState.LOCKED);
      }).not.toThrow();
    });

    it('should reject invalid transitions', () => {
      expect(() => {
        StateMachine.validateTransition(RunState.PENDING, RunState.COMPLETED);
      }).toThrow('Invalid state transition');
    });
  });

  describe('isTerminal', () => {
    it('should identify terminal states', () => {
      expect(StateMachine.isTerminal(RunState.COMPLETED)).toBe(true);
      expect(StateMachine.isTerminal(RunState.ROLLED_BACK)).toBe(true);
      expect(StateMachine.isTerminal(RunState.FAILED)).toBe(true);
    });

    it('should identify non-terminal states', () => {
      expect(StateMachine.isTerminal(RunState.PENDING)).toBe(false);
      expect(StateMachine.isTerminal(RunState.PROVISIONING)).toBe(false);
    });
  });

  describe('canRollback', () => {
    it('should allow rollback after provisioning', () => {
      expect(StateMachine.canRollback(RunState.PROVISIONING)).toBe(true);
      expect(StateMachine.canRollback(RunState.TRAFFIC_SHIFT)).toBe(true);
    });

    it('should not allow rollback before provisioning', () => {
      expect(StateMachine.canRollback(RunState.PENDING)).toBe(false);
      expect(StateMachine.canRollback(RunState.LOCKED)).toBe(false);
    });
  });
});
