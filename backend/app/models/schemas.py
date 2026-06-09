from typing import Any, Literal
from pydantic import BaseModel, Field


class ValidationIssue(BaseModel):
    level: Literal["info", "warning", "error"]
    message: str


class PreviewResponse(BaseModel):
    columns: list[str]
    rows: list[dict[str, Any]]
    detected_separator: str
    id_column: str
    item_columns: list[str]
    metadata_columns: list[str]
    issues: list[ValidationIssue]


class GlobalMetrics(BaseModel):
    cronbach_alpha: float | None
    mean_score: float
    mean_percent: float
    students_count: int
    items_count: int
    score_std: float
    min_score: int
    max_score: int


class ItemMetric(BaseModel):
    item: str
    order: int
    frequency_correct: int
    proportion_correct: float
    difficulty_p_star: float
    discrimination: float | None
    point_biserial: float | None
    coefficient_d_i: float
    item_total_correlation: float | None


class StudentMetric(BaseModel):
    student_id: str
    raw_score: int
    total_correct: int
    percent_correct: float
    caution_index_c_n: float
    guesses: int
    anomalous_errors: int
    metadata: dict[str, Any] = Field(default_factory=dict)


class SPCell(BaseModel):
    student_id: str
    item: str
    row: int
    col: int
    value: int
    zone: Literal["expected_correct", "expected_error", "unexpected_correct", "anomalous_error"]


class SPCurvePoint(BaseModel):
    label: str
    index: int
    value: int


class SPAnalysis(BaseModel):
    ordered_students: list[str]
    ordered_items: list[str]
    student_curve: list[SPCurvePoint]
    problem_curve: list[SPCurvePoint]
    cells: list[SPCell]
    intersections: list[dict[str, int | str]]
    zone_counts: dict[str, int]


class GroupMetric(BaseModel):
    variable: str
    group: str
    n: int
    mean_score: float
    mean_percent: float
    std_score: float
    cronbach_alpha: float | None


class AnalysisResponse(BaseModel):
    globals: GlobalMetrics
    items: list[ItemMetric]
    students: list[StudentMetric]
    sp: SPAnalysis
    groups: list[GroupMetric]
    preview: PreviewResponse
    warnings: list[str]

