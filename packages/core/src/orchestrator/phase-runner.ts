/**
 * Phase Runner - Core orchestrator for executing deployment runs
 */

import { PhaseContext, PhaseResult, PhaseExecutor, DEFAULT_RETRY_CONFIG } from '../types/phase';
import { Run, RunState, PhaseStatus } from '../types/run';
import { StateMachine } from './state-machine';
import { DatabaseClient } from '../lib/database';

export interface IEvidenceStore {
  // Minimal interface for evidence storage
  storeArtifact(
    run_id: string,
    tenant_id: string,
    phase: number,
    artifact: { type: string; content: unknown }
  ): Promise<void>;
}

export class PhaseRunner {
  constructor(
    private executors: Map<number, PhaseExecutor>,
    private db: DatabaseClient,
    private evidenceStore: IEvidenceStore
  ) {}

  /**
   * Execute a single run (phases 1-10)
   */
  async executeRun(run: Run): Promise<Run> {
    let currentRun = { ...run };

    try {
      // Execute phases 1-10 in sequence
      for (let phase = 1; phase <= 10; phase++) {
        // Check idempotency: skip if phase already completed
        const completed = await this.isPhaseCompleted(run.run_id, phase);
        if (completed) {
          console.log(`Phase ${phase} already completed for run ${run.run_id}, skipping`);
          continue;
        }

        const executor = this.executors.get(phase);
        if (!executor) {
          throw new Error(`No executor found for phase ${phase}`);
        }

        // Build phase context
        const context: PhaseContext = {
          run_id: run.run_id,
          tenant_id: run.tenant_id,
          env_id: run.env_id,
          blueprint: {} as any, // TODO: Load blueprint from DB
          config: run.config,
          phase,
        };

        // Execute phase with retry logic
        const result = await this.executePhase(context, executor);

        // Record phase event
        await this.recordPhaseEvent(run.run_id, phase, result);

        // Store artifacts
        for (const artifact of result.artifacts) {
          await this.evidenceStore.storeArtifact(run.run_id, run.tenant_id, phase, artifact);
        }

        // Update run state
        if (result.success) {
          currentRun.state = result.next_state;
          currentRun.current_phase = phase;
          await this.updateRunState(run.run_id, result.next_state, phase);

          // Check if terminal state reached
          if (StateMachine.isTerminal(result.next_state)) {
            currentRun.completed_at = new Date();
            break;
          }
        } else {
          // Phase failed
          const failureState = StateMachine.getFailureState(currentRun.state);
          currentRun.state = failureState;
          await this.updateRunState(run.run_id, failureState, phase);
          throw new Error(`Phase ${phase} failed: ${result.error}`);
        }
      }

      return currentRun;
    } catch (error) {
      console.error(`Run ${run.run_id} failed:`, error);
      throw error;
    }
  }

  /**
   * Execute a single phase with idempotency + retry
   */
  private async executePhase(
    context: PhaseContext,
    executor: PhaseExecutor
  ): Promise<PhaseResult> {
    const startTime = Date.now();
    let lastError: Error | undefined;

    const maxAttempts = executor.canRetry() ? DEFAULT_RETRY_CONFIG.max_attempts : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await executor.execute(context);
        result.duration_ms = Date.now() - startTime;
        return result;
      } catch (error) {
        lastError = error as Error;
        console.error(
          `Phase ${context.phase} attempt ${attempt}/${maxAttempts} failed:`,
          error
        );

        if (attempt < maxAttempts) {
          // Calculate retry delay with exponential backoff
          const delay = Math.min(
            DEFAULT_RETRY_CONFIG.initial_delay_ms * Math.pow(DEFAULT_RETRY_CONFIG.multiplier, attempt - 1),
            DEFAULT_RETRY_CONFIG.max_delay_ms
          );

          // Add jitter
          const jitter = delay * DEFAULT_RETRY_CONFIG.jitter * Math.random();
          const finalDelay = delay + jitter;

          console.log(`Retrying phase ${context.phase} after ${finalDelay}ms...`);
          await this.sleep(finalDelay);
        }
      }
    }

    // All retries exhausted
    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      outputs: {},
      artifacts: [],
      next_state: StateMachine.getFailureState(RunState.PENDING), // Will be overridden
      duration_ms: Date.now() - startTime,
    };
  }

  /**
   * Check if phase already completed (idempotency)
   */
  private async isPhaseCompleted(run_id: string, phase: number): Promise<boolean> {
    const result = await this.db.query(
      'SELECT 1 FROM phase_events WHERE run_id = $1 AND phase = $2 AND status = $3 LIMIT 1',
      [run_id, phase, PhaseStatus.SUCCESS]
    );
    return result.rows.length > 0;
  }

  /**
   * Persist phase event to database
   */
  private async recordPhaseEvent(
    run_id: string,
    phase: number,
    result: PhaseResult
  ): Promise<void> {
    const status = result.success ? PhaseStatus.SUCCESS : PhaseStatus.FAILED;

    await this.db.query(
      `
      INSERT INTO phase_events (run_id, phase, status, duration_ms, outputs, error)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
      [
        run_id,
        phase,
        status,
        result.duration_ms,
        JSON.stringify(result.outputs),
        result.error || null,
      ]
    );
  }

  /**
   * Update run state
   */
  private async updateRunState(
    run_id: string,
    state: RunState,
    current_phase: number
  ): Promise<void> {
    await this.db.query(
      'UPDATE runs SET state = $1, current_phase = $2 WHERE run_id = $3',
      [state, current_phase, run_id]
    );
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
