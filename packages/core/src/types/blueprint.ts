/**
 * Blueprint schema types
 */

export interface Blueprint {
  name: string;
  version: string;
  provider: 'mock' | 'azure' | 'aws' | 'gcp';
  components: Component[];
  traffic_strategy: TrafficStrategy;
  readiness_checks: ReadinessCheck[];
  metrics_config: MetricsConfig;
  decision_rules: DecisionRule[];
  policies_required: string[];
  evidence_requirements: EvidenceRequirements;
}

export interface Component {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

export interface TrafficStrategy {
  type: 'blue-green' | 'canary' | 'rolling';
  steps: number[];
  soak_duration_seconds: number;
}

export interface ReadinessCheck {
  component_id: string;
  check_type: 'http' | 'tcp' | 'ssh' | 'custom';
  endpoint?: string;
  timeout_seconds: number;
  retries: number;
}

export interface MetricsConfig {
  sources: MetricsSource[];
  metrics: Metric[];
  observation_window_seconds: number;
}

export interface MetricsSource {
  type: 'mock' | 'prometheus' | 'cloudwatch' | 'azure-monitor';
  config: Record<string, unknown>;
}

export interface Metric {
  name: string;
  query: string;
  unit?: string;
}

export interface DecisionRule {
  metric: string;
  operator: '<' | '<=' | '>' | '>=' | '==' | '!=';
  threshold: number;
  action: 'promote' | 'rollback' | 'hold';
  severity: 'critical' | 'warning';
}

export interface EvidenceRequirements {
  retention_days: number;
  sign_manifest: boolean;
}
