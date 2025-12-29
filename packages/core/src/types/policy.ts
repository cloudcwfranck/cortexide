/**
 * Policy engine types
 */

export interface PolicyReport {
  result: 'pass' | 'fail';
  evaluated_policies: string[];
  violations: PolicyViolation[];
  warnings: PolicyWarning[];
  evaluated_at: Date;
}

export interface PolicyViolation {
  rule: string;
  resource: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface PolicyWarning {
  rule: string;
  resource: string;
  message: string;
}

export interface PolicyBundle {
  name: string;
  version: string;
  rego_code: string;
}
