/**
 * Mock Adapter
 *
 * Deterministic mock provider for testing and v0.1 development
 */

import {
  ProviderAdapter,
  StateSnapshot,
  ProvisionPlan,
  ProvisionResult,
  ReadinessReport,
  TrafficShiftStep,
  TrafficShiftResult,
  MetricsWindow,
  RollbackResult,
} from '../types/adapter';
import { PhaseContext } from '../types/phase';
import { ReadinessCheck, MetricsConfig } from '../types/blueprint';

export class MockAdapter implements ProviderAdapter {
  name = 'mock-adapter';
  provider = 'mock' as const;

  /**
   * Phase 2: Verify current state
   */
  verifyState(_context: PhaseContext): Promise<StateSnapshot> {
    // Deterministic mock state snapshot
    return Promise.resolve({
      timestamp: new Date(),
      resources: [
        {
          id: 'web-vm-pool-old',
          type: 'compute.vmss',
          properties: {
            instance_count: 2,
            vm_size: 'Standard_D2s_v3',
            status: 'running',
          },
        },
        {
          id: 'load-balancer-prod',
          type: 'network.loadbalancer',
          properties: {
            backend_pool: 'web-vm-pool-old',
            current_weight: 100,
          },
        },
      ],
      drift: [], // No drift in mock
    });
  }

  /**
   * Phase 4: Plan provisioning
   */
  plan(_context: PhaseContext): Promise<ProvisionPlan> {
    return Promise.resolve({
      actions: [
        {
          action: 'create',
          resource_type: 'compute.vmss',
          resource_id: 'web-vm-pool-new',
          changes: {
            instance_count: 2,
            vm_size: 'Standard_D2s_v3',
          },
        },
        {
          action: 'update',
          resource_type: 'network.loadbalancer',
          resource_id: 'load-balancer-prod',
          changes: {
            backend_pools: ['web-vm-pool-old', 'web-vm-pool-new'],
          },
        },
      ],
      estimated_duration_ms: 180000, // 3 minutes
    });
  }

  /**
   * Phase 4: Apply provisioning
   */
  async apply(_plan: ProvisionPlan): Promise<ProvisionResult> {
    // Simulate provisioning delay (50-200ms for tests)
    await this.sleep(100);

    return {
      resources_created: ['web-vm-pool-new'],
      resources_updated: ['load-balancer-prod'],
      resources_deleted: [],
      outputs: {
        new_pool_id: 'web-vm-pool-new',
        new_pool_ips: ['10.0.1.10', '10.0.1.11'],
      },
    };
  }

  /**
   * Phase 5: Wait for readiness
   */
  async waitForReadiness(
    _resources: string[],
    checks: ReadinessCheck[]
  ): Promise<ReadinessReport> {
    // Simulate health check delay
    await this.sleep(50);

    return {
      checks: checks.map((check) => ({
        resource_id: check.component_id,
        check_type: check.check_type,
        status: 'pass',
        message: `Health check passed for ${check.component_id}`,
        latency_ms: 45,
      })),
      all_passed: true,
    };
  }

  /**
   * Phase 6: Shift traffic
   */
  async shiftTraffic(step: TrafficShiftStep): Promise<TrafficShiftResult> {
    // Simulate traffic shift delay
    await this.sleep(30);

    return {
      applied_weight: step.weight_percentage,
      timestamp: new Date(),
      controller_id: 'load-balancer-prod',
    };
  }

  /**
   * Phase 7: Collect metrics
   */
  async collectMetrics(_config: MetricsConfig, window_seconds: number): Promise<MetricsWindow> {
    // Simulate metrics collection delay
    await this.sleep(50);

    const now = new Date();
    const window_start = new Date(now.getTime() - window_seconds * 1000);

    return {
      window_start,
      window_end: now,
      metrics: {
        error_rate: {
          value: 0.003, // 0.3% - below threshold (1%)
          unit: 'percent',
          threshold: 0.01,
        },
        latency_p95: {
          value: 245, // 245ms - below threshold (300ms)
          unit: 'milliseconds',
          threshold: 300,
        },
      },
    };
  }

  /**
   * Rollback to previous state
   */
  async rollback(_run_id: string, _target_state: StateSnapshot): Promise<RollbackResult> {
    // Simulate rollback delay
    await this.sleep(100);

    return {
      reverted_resources: ['web-vm-pool-new'],
      traffic_weight: 0, // All traffic back to old pool
      timestamp: new Date(),
    };
  }

  /**
   * Sleep utility for deterministic delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
