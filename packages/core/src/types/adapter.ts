/**
 * Provider adapter types
 */

import { ReadinessCheck, MetricsConfig } from './blueprint';
import { PhaseContext } from './phase';

// Provider adapter interface
export interface ProviderAdapter {
  name: string;
  provider: 'mock' | 'azure' | 'aws' | 'gcp';

  // Phase 2: Verify current state
  verifyState(context: PhaseContext): Promise<StateSnapshot>;

  // Phase 4: Provision resources
  plan(context: PhaseContext): Promise<ProvisionPlan>;
  apply(plan: ProvisionPlan): Promise<ProvisionResult>;

  // Phase 5: Wait for readiness
  waitForReadiness(resources: string[], checks: ReadinessCheck[]): Promise<ReadinessReport>;

  // Phase 6: Shift traffic
  shiftTraffic(step: TrafficShiftStep): Promise<TrafficShiftResult>;

  // Phase 7: Collect metrics
  collectMetrics(config: MetricsConfig, window_seconds: number): Promise<MetricsWindow>;

  // Rollback
  rollback(run_id: string, target_state: StateSnapshot): Promise<RollbackResult>;
}

export interface StateSnapshot {
  timestamp: Date;
  resources: ResourceInventory[];
  drift: DriftItem[];
}

export interface ResourceInventory {
  id: string;
  type: string;
  properties: Record<string, unknown>;
}

export interface DriftItem {
  resource_id: string;
  property: string;
  expected: unknown;
  actual: unknown;
}

export interface ProvisionPlan {
  actions: PlannedAction[];
  estimated_duration_ms: number;
}

export interface PlannedAction {
  action: 'create' | 'update' | 'delete';
  resource_type: string;
  resource_id: string;
  changes: Record<string, unknown>;
}

export interface ProvisionResult {
  resources_created: string[];
  resources_updated: string[];
  resources_deleted: string[];
  outputs: Record<string, unknown>;
}

export interface ReadinessReport {
  checks: CheckResult[];
  all_passed: boolean;
}

export interface CheckResult {
  resource_id: string;
  check_type: string;
  status: 'pass' | 'fail';
  message: string;
  latency_ms?: number;
}

export interface TrafficShiftStep {
  weight_percentage: number;
  target_resources: string[];
}

export interface TrafficShiftResult {
  applied_weight: number;
  timestamp: Date;
  controller_id: string;
}

export interface MetricsWindow {
  window_start: Date;
  window_end: Date;
  metrics: Record<string, MetricValue>;
}

export interface MetricValue {
  value: number;
  unit: string;
  threshold?: number;
}

export interface RollbackResult {
  reverted_resources: string[];
  traffic_weight: number;
  timestamp: Date;
}
