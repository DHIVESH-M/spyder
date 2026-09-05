export type ConfidenceLevel = 'High' | 'Medium' | 'Low' | 'Possible';

export interface DetectedComponent {
  id: string;
  name: string;
  confidence: number; // 0-100
  materials: string[];
  recoveryMethod: string;
  recoveryPotential: ConfidenceLevel;
  // Short explanation of the physical-condition judgment (optional —
  // present for AI-analyzed scans, may be absent on older/mock records).
  reason?: string;
  // bounding box as percentages of image dimensions
  box: { x: number; y: number; w: number; h: number };
}

export interface MaterialEntry {
  id: string;
  name: string;
  potential: ConfidenceLevel;
  note?: string;
}

export interface RecoveryStep {
  step: number;
  title: string;
  detail: string;
}

export interface ScanResult {
  device: string;
  confidence: number;
  components: DetectedComponent[];
  materials: MaterialEntry[];
  recoveryWorkflow: RecoveryStep[];
  recoveryPotential: {
    score: number; // 0-100
    componentReuse: number; // %
    materialRecovery: number; // %
  };
  imageHint?: string;
  // Present on real Gemini scans: a reminder that a photo can't verify
  // electrical functionality and testing is required before reuse.
  disclaimer?: string;
}

export interface ScanRecord {
  id: string;
  device_name: string;
  confidence: number;
  recovery_score: number;
  component_reuse: number;
  material_recovery: number;
  image_url: string | null;
  components: DetectedComponent[];
  materials: MaterialEntry[];
  workflow: RecoveryStep[];
  created_at: string;
}
