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
    group_size = max(1, n // 3)
    if n < 3 or group_size == 0:
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


def _sp_zone(value: int, col: int, student_score: int) -> str:
    expected_correct = col < student_score
    if value == 1 and expected_correct:
        return "expected_correct"
    if value == 0 and expected_correct:
        return "anomalous_error"
    if value == 1:
        return "unexpected_correct"
    return "expected_error"


def _student_id_series(context: MatrixContext) -> pd.Series:
    return context.df[context.id_column].astype(str)


def _build_sp(context: MatrixContext, scores: pd.Series) -> SPAnalysis:
    matrix = context.matrix.copy()
    item_correct = matrix.sum(axis=0)
    ordered_items = item_correct.sort_values(ascending=False).index.tolist()

    sortable = pd.DataFrame(
        {
            "student_id": _student_id_series(context),
            "score": scores,
        }
    )
    ordered_students = sortable.sort_values(["score", "student_id"], ascending=[False, True])["student_id"].tolist()

    ordered_df = context.df.set_index(_student_id_series(context)).loc[ordered_students]
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
            zone = _sp_zone(value, col, student_score)

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


def _item_metrics(context: MatrixContext, scores: pd.Series) -> list[ItemMetric]:
    matrix = context.matrix
    metrics: list[ItemMetric] = []

    for order, item in enumerate(context.item_columns):
        values = matrix[item]
        frequency_correct = int(values.sum())
        proportion_correct = frequency_correct / len(values)
        scores_without_item = scores - values
        discrimination = _upper_lower_discrimination(matrix, scores, item)
        point_biserial = _point_biserial(values, scores_without_item)
        metrics.append(
            ItemMetric(
                item=item,
                order=order + 1,
                frequency_correct=frequency_correct,
                proportion_correct=round(float(proportion_correct), 4),
                difficulty_p_star=round(float(proportion_correct), 4),
                discrimination=discrimination,
                point_biserial=point_biserial,
                coefficient_d_i=discrimination,
                item_total_correlation=point_biserial,
            )
        )
    return metrics


def _student_metrics(context: MatrixContext, scores: pd.Series, sp: SPAnalysis) -> list[StudentMetric]:
    student_ids = _student_id_series(context)
    ordered_df = context.df.set_index(student_ids).loc[sp.ordered_students]
    ordered_matrix = ordered_df[sp.ordered_items].astype(int)
    item_weights = ordered_matrix.sum(axis=0).astype(float)
    total_weight = float(item_weights.sum())
    inconsistency_by_student: dict[str, tuple[float, int, int]] = {}

    for student_id, response_row in ordered_matrix.iterrows():
        student_score = int(response_row.sum())
        guesses = 0
        anomalous_errors = 0
        penalty = 0.0

        for col, item in enumerate(sp.ordered_items):
            zone = _sp_zone(int(response_row[item]), col, student_score)
            if zone == "unexpected_correct":
                guesses += 1
                penalty += float(item_weights[item])
            elif zone == "anomalous_error":
                anomalous_errors += 1
                penalty += float(item_weights[item])

        caution = penalty / total_weight if total_weight > 0 else 0.0
        inconsistency_by_student[str(student_id)] = (round(caution, 4), guesses, anomalous_errors)

    metrics: list[StudentMetric] = []
    for idx, row in context.df.iterrows():
        student_id = student_ids.loc[idx]
        total_correct = int(scores.loc[idx])
        metadata = {col: row[col] for col in context.metadata_columns if col in context.df.columns}
        caution, guess_count, anomaly_count = inconsistency_by_student.get(student_id, (0.0, 0, 0))
        metrics.append(
            StudentMetric(
                student_id=student_id,
                raw_score=total_correct,
                total_correct=total_correct,
                percent_correct=round(total_correct / len(context.item_columns), 4),
                caution_index_c_n=caution,
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
    if sp.zone_counts["unexpected_correct"] == 0 and sp.zone_counts["anomalous_error"] == 0:
        warnings.append(
            "A Curva S-P não identificou chutes ou erros anômalos. Isso pode ocorrer quando a matriz fica perfeitamente escalonada após ordenar estudantes por escore e itens por proporção de acertos."
        )

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
        items=_item_metrics(context, scores),
        students=_student_metrics(context, scores, sp),
        sp=sp,
        groups=_group_metrics(context, scores),
        preview=preview,
        warnings=warnings,
    )
