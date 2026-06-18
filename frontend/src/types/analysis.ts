export type Zone = "expected_correct" | "expected_error" | "unexpected_correct" | "anomalous_error";

export interface ValidationIssue {
  level: "info" | "warning" | "error";
  message: string;
}

export interface PreviewResponse {
  columns: string[];
  rows: Record<string, unknown>[];
  detected_separator: string;
  id_column: string;
  item_columns: string[];
  metadata_columns: string[];
  issues: ValidationIssue[];
}

export interface GlobalMetrics {
  cronbach_alpha: number | null;
  mean_score: number;
  mean_percent: number;
  students_count: number;
  items_count: number;
  score_std: number;
  min_score: number;
  max_score: number;
}

export interface ItemMetric {
  item: string;
  order: number;
  frequency_correct: number;
  proportion_correct: number;
  difficulty_p_star: number;
  discrimination: number | null;
  point_biserial: number | null;
  coefficient_d_i: number;
  item_total_correlation: number | null;
}

export interface StudentMetric {
  student_id: string;
  raw_score: number;
  total_correct: number;
  percent_correct: number;
  caution_index_c_n: number;
  guesses: number;
  anomalous_errors: number;
  metadata: Record<string, unknown>;
}

export interface SPCell {
  student_id: string;
  item: string;
  row: number;
  col: number;
  value: 0 | 1;
  zone: Zone;
}

export interface SPCurvePoint {
  label: string;
  index: number;
  value: number;
}

export interface SPAnalysis {
  ordered_students: string[];
  ordered_items: string[];
  student_curve: SPCurvePoint[];
  problem_curve: SPCurvePoint[];
  cells: SPCell[];
  intersections: Array<Record<string, number | string>>;
  zone_counts: Record<Zone, number>;
}

export interface GroupMetric {
  variable: string;
  group: string;
  n: number;
  mean_score: number;
  mean_percent: number;
  std_score: number;
  cronbach_alpha: number | null;
}

export interface AnalysisResponse {
  globals: GlobalMetrics;
  items: ItemMetric[];
  students: StudentMetric[];
  sp: SPAnalysis;
  groups: GroupMetric[];
  preview: PreviewResponse;
  warnings: string[];
}

