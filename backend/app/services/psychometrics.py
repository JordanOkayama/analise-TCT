from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd

try:
    from scipy import stats
except ModuleNotFoundError:  # Permite validação local antes da instalação completa dos requisitos.
    stats = None

from app.models.schemas import (
    AnalysisResponse,
    GlobalMetrics,
    GroupMetric,
    ItemMetric,
    SPAnalysis,
    SPCell,
    SPCurvePoint,
    StudentMetric,
)
from app.services.csv_parser import build_preview


@dataclass(frozen=True)
class MatrixContext:
    df: pd.DataFrame
    separator: str
    id_column: str
    item_columns: list[str]
    metadata_columns: list[str]
    issues: list[Any]

    @property
    def matrix(self) -> pd.DataFrame:
        return self.df[self.item_columns].astype(int)


def _safe_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if np.isnan(number) or np.isinf(number):
        return None
    return round(number, 4)


def cronbach_alpha(matrix: pd.DataFrame) -> float | None:
    k = matrix.shape[1]
    if k < 2 or matrix.shape[0] < 2:
        return None
    item_variances = matrix.var(axis=0, ddof=1)
    total_variance = matrix.sum(axis=1).var(ddof=1)
    if total_variance <= 0:
        return None
    alpha = (k / (k - 1)) * (1 - item_variances.sum() / total_variance)
    return _safe_float(alpha)


def _upper_lower_discrimination(matrix: pd.DataFrame, scores: pd.Series, item: str) -> float | None:
    n = len(scores)
    group_size = max(1, int(round(n * 0.27)))
    if n < 4 or group_size == 0:
        return None
    ordered = matrix.assign(_score=scores).sort_values("_score", ascending=False)
    upper = ordered.head(group_size)[item].mean()
    lower = ordered.tail(group_size)[item].mean()
    return _safe_float(upper - lower)


def _point_biserial(item_values: pd.Series, scores_without_item: pd.Series) -> float | None:
    if item_values.nunique() < 2 or scores_without_item.nunique() < 2:
        return None
    try:
        if stats is not None:
            result = stats.pointbiserialr(item_values.astype(int), scores_without_item.astype(float))
            return _safe_float(result.statistic)
        corr = np.corrcoef(item_values.astype(int), scores_without_item.astype(float))[0, 1]
        return _safe_float(corr)
    except Exception:
        return None


def _build_sp(context: MatrixContext, scores: pd.Series) -> SPAnalysis:
    matrix = context.matrix.copy()
    item_correct = matrix.sum(axis=0)
    ordered_items = item_correct.sort_values(ascending=False).index.tolist()

    sortable = pd.DataFrame(
        {
            "student_id": context.df[context.id_column].astype(str),
            "score": scores,
        }
    )
    ordered_students = sortable.sort_values(["score", "student_id"], ascending=[False, True])["student_id"].tolist()

    ordered_df = context.df.set_index(context.df[context.id_column].astype(str)).loc[ordered_students]
    ordered_matrix = ordered_df[ordered_items].astype(int)

    student_curve = [
        SPCurvePoint(label=student_id, index=i, value=int(ordered_matrix.loc[student_id].sum()))
        for i, student_id in enumerate(ordered_students)
    ]
    problem_curve = [
        SPCurvePoint(label=item, index=i, value=int(ordered_matrix[item].sum()))
        for i, item in enumerate(ordered_items)
    ]

    cells: list[SPCell] = []
    zone_counts = {
        "expected_correct": 0,
        "expected_error": 0,
        "unexpected_correct": 0,
        "anomalous_error": 0,
    }
    intersections: list[dict[str, int | str]] = []

    for row, student_id in enumerate(ordered_students):
        student_score = int(ordered_matrix.loc[student_id].sum())
        for col, item in enumerate(ordered_items):
            value = int(ordered_matrix.loc[student_id, item])
            expected_by_student = col < student_score
            expected_by_problem = row < int(ordered_matrix[item].sum())
            expected_correct = expected_by_student and expected_by_problem
            expected_error = not expected_by_student and not expected_by_problem

            if value == 1 and expected_correct:
                zone = "expected_correct"
            elif value == 0 and expected_error:
                zone = "expected_error"
            elif value == 1:
                zone = "unexpected_correct"
            else:
                zone = "anomalous_error"

            zone_counts[zone] += 1
            if col == student_score or row == int(ordered_matrix[item].sum()):
                intersections.append({"student_id": student_id, "item": item, "row": row, "col": col})

            cells.append(SPCell(student_id=student_id, item=item, row=row, col=col, value=value, zone=zone))

    return SPAnalysis(
        ordered_students=ordered_students,
        ordered_items=ordered_items,
        student_curve=student_curve,
        problem_curve=problem_curve,
        cells=cells,
        intersections=intersections[:500],
        zone_counts=zone_counts,
    )


def _item_metrics(context: MatrixContext, scores: pd.Series, sp: SPAnalysis) -> list[ItemMetric]:
    matrix = context.matrix
    metrics: list[ItemMetric] = []
    unexpected_by_item: dict[str, int] = {item: 0 for item in context.item_columns}
    for cell in sp.cells:
        if cell.zone in {"unexpected_correct", "anomalous_error"}:
            unexpected_by_item[cell.item] += 1

    for order, item in enumerate(context.item_columns):
        values = matrix[item]
        frequency_correct = int(values.sum())
        proportion_correct = frequency_correct / len(values)
        scores_without_item = scores - values
        metrics.append(
            ItemMetric(
                item=item,
                order=order + 1,
                frequency_correct=frequency_correct,
                proportion_correct=round(float(proportion_correct), 4),
                difficulty_p_star=round(float(1 - proportion_correct), 4),
                discrimination=_upper_lower_discrimination(matrix, scores, item),
                point_biserial=_point_biserial(values, scores_without_item),
                coefficient_d_i=round(unexpected_by_item.get(item, 0) / max(1, len(values)), 4),
                item_total_correlation=_point_biserial(values, scores_without_item),
            )
        )
    return metrics


def _student_metrics(context: MatrixContext, scores: pd.Series, sp: SPAnalysis) -> list[StudentMetric]:
    anomalous: dict[str, int] = {}
    guesses: dict[str, int] = {}
    for cell in sp.cells:
        if cell.zone == "anomalous_error":
            anomalous[cell.student_id] = anomalous.get(cell.student_id, 0) + 1
        if cell.zone == "unexpected_correct":
            guesses[cell.student_id] = guesses.get(cell.student_id, 0) + 1

    metrics: list[StudentMetric] = []
    for idx, row in context.df.iterrows():
        student_id = str(row[context.id_column])
        total_correct = int(scores.loc[idx])
        metadata = {col: row[col] for col in context.metadata_columns if col in context.df.columns}
        anomaly_count = anomalous.get(student_id, 0)
        guess_count = guesses.get(student_id, 0)
        metrics.append(
            StudentMetric(
                student_id=student_id,
                raw_score=total_correct,
                total_correct=total_correct,
                percent_correct=round(total_correct / len(context.item_columns), 4),
                caution_index_c_n=round(anomaly_count / max(1, len(context.item_columns) - total_correct), 4),
                guesses=guess_count,
                anomalous_errors=anomaly_count,
                metadata=metadata,
            )
        )
    return metrics


def _group_metrics(context: MatrixContext, scores: pd.Series) -> list[GroupMetric]:
    groups: list[GroupMetric] = []
    matrix = context.matrix
    for variable in context.metadata_columns:
        if variable not in context.df.columns:
            continue
        grouped = context.df.assign(_score=scores).groupby(variable, dropna=False)
        for group_name, group_df in grouped:
            indices = group_df.index
            group_matrix = matrix.loc[indices]
            mean_score = float(group_df["_score"].mean())
            groups.append(
                GroupMetric(
                    variable=variable,
                    group=str(group_name),
                    n=int(len(group_df)),
                    mean_score=round(mean_score, 4),
                    mean_percent=round(mean_score / max(1, len(context.item_columns)), 4),
                    std_score=round(float(group_df["_score"].std(ddof=1) or 0), 4),
                    cronbach_alpha=cronbach_alpha(group_matrix),
                )
            )
    return groups


def analyze_matrix(context: MatrixContext) -> AnalysisResponse:
    matrix = context.matrix
    scores = matrix.sum(axis=1)
    sp = _build_sp(context, scores)
    alpha = cronbach_alpha(matrix)
    warnings: list[str] = []

    if alpha is None:
        warnings.append("O Alfa de Cronbach não pôde ser estimado com variância total nula ou amostra insuficiente.")
    if len(context.df) < 30:
        warnings.append("A amostra possui menos de 30 examinandos; interprete correlações e discriminação com cautela.")

    preview = build_preview(
        context.df,
        context.separator,
        context.id_column,
        context.item_columns,
        context.metadata_columns,
        context.issues,
    )

    return AnalysisResponse(
        globals=GlobalMetrics(
            cronbach_alpha=alpha,
            mean_score=round(float(scores.mean()), 4),
            mean_percent=round(float(scores.mean() / max(1, len(context.item_columns))), 4),
            students_count=int(len(context.df)),
            items_count=int(len(context.item_columns)),
            score_std=round(float(scores.std(ddof=1) or 0), 4),
            min_score=int(scores.min()),
            max_score=int(scores.max()),
        ),
        items=_item_metrics(context, scores, sp),
        students=_student_metrics(context, scores, sp),
        sp=sp,
        groups=_group_metrics(context, scores),
        preview=preview,
        warnings=warnings,
    )
