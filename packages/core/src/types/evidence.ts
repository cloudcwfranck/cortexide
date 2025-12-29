/**
 * Evidence store types
 */

export interface EvidenceArtifact {
  artifact_id: string;
  run_id: string;
  tenant_id: string;
  phase: number;
  artifact_type: string;
  storage_path: string;
  hash_sha256: string;
  size_bytes: number;
  created_at: Date;
  metadata: Record<string, unknown>;
}

export interface RunManifest {
  run_id: string;
  tenant_id: string;
  env_id: string;
  started_at: Date;
  completed_at: Date;
  decision: string;
  artifacts: ArtifactReference[];
  manifest_hash: string;
  signature?: string;
}

export interface ArtifactReference {
  artifact_id: string;
  phase: number;
  type: string;
  hash: string;
  size_bytes: number;
}

export interface EvidenceStoreConfig {
  base_path: string; // v0.1: /tmp/cortexide-evidence
  enable_signing: boolean; // v0.1: false
}
