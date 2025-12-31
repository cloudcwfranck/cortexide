/**
 * Policy Engine
 *
 * OPA WASM-based policy evaluation (v0.1: baseline policy only)
 */

import { PolicyReport, PolicyBundle } from '../types/policy';
import { Blueprint } from '../types/blueprint';
import { StateSnapshot } from '../types/adapter';

export class PolicyEngine {
  private currentBundle: PolicyBundle | null = null;

  constructor() {}

  /**
   * Load OPA policy bundle
   */
  loadBundle(bundle: PolicyBundle): Promise<void> {
    // v0.1: Store bundle in memory
    // v1.0: Use @open-policy-agent/opa-wasm for real evaluation
    this.currentBundle = bundle;
    return Promise.resolve();
  }

  /**
   * Evaluate policies (v0.1: baseline mock evaluation)
   */
  evaluatePolicies(
    blueprint: Blueprint,
    _currentState: StateSnapshot,
    _desiredState: Record<string, unknown>
  ): Promise<PolicyReport> {
    // v0.1: Mock policy evaluation - always pass baseline checks
    // v1.0: Real OPA evaluation with bundle.rego_code

    const evaluated_policies = blueprint.policies_required || ['baseline-v1'];

    // Mock baseline checks
    const violations = [];

    // Check 1: All components must have required config
    for (const component of blueprint.components) {
      if (!component.config || Object.keys(component.config).length === 0) {
        violations.push({
          rule: 'require_component_config',
          resource: component.id,
          message: `Component ${component.id} missing configuration`,
          severity: 'high' as const,
        });
      }
    }

    // Check 2: Traffic strategy must have valid steps
    if (blueprint.traffic_strategy.steps.length === 0) {
      violations.push({
        rule: 'require_traffic_steps',
        resource: 'traffic_strategy',
        message: 'Traffic strategy must define at least one step',
        severity: 'critical' as const,
      });
    }

    // Check 3: Decision rules must exist
    if (blueprint.decision_rules.length === 0) {
      violations.push({
        rule: 'require_decision_rules',
        resource: 'decision_rules',
        message: 'At least one decision rule required for promote/rollback logic',
        severity: 'critical' as const,
      });
    }

    return Promise.resolve({
      result: violations.length === 0 ? 'pass' : 'fail',
      evaluated_policies,
      violations,
      warnings: [],
      evaluated_at: new Date(),
    });
  }

  /**
   * Get policy bundle version
   */
  getBundleVersion(): string {
    return this.currentBundle?.version || 'baseline-v1';
  }
}
