import csv
from io import BytesIO, StringIO
from typing import Any

import pandas as pd

from app.models.schemas import PreviewResponse, ValidationIssue


ID_CANDIDATES = {"id", "ID", "Id", "codigo", "Código", "aluno_id", "student_id"}
METADATA_CANDIDATES = {
    "escola",
    "municipio",
    "município",
    "turma",
    "serie",
    "série",
    "grupo",
    "rede",
}


class CSVValidationError(ValueError):
    pass


def detect_separator(raw: bytes) -> str:
    sample = raw[:8192].decode("utf-8-sig", errors="replace")
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;")
        return dialect.delimiter
    except csv.Error:
        return ";" if sample.count(";") > sample.count(",") else ","


def read_csv_upload(raw: bytes) -> tuple[pd.DataFrame, str]:
    if not raw:
        raise CSVValidationError("O arquivo CSV está vazio.")

    separator = detect_separator(raw)
    try:
        df = pd.read_csv(BytesIO(raw), sep=separator, encoding="utf-8-sig")
    except UnicodeDecodeError:
        df = pd.read_csv(BytesIO(raw), sep=separator, encoding="latin-1")
    except Exception as exc:
        raise CSVValidationError(f"Não foi possível ler o CSV: {exc}") from exc

    df.columns = [str(col).strip() for col in df.columns]
    if df.empty:
        raise CSVValidationError("O CSV não contém linhas de dados.")
    return df, separator


def infer_columns(df: pd.DataFrame) -> tuple[str, list[str], list[str], list[ValidationIssue]]:
    issues: list[ValidationIssue] = []
    id_column = next((col for col in df.columns if col in ID_CANDIDATES), "")
    if not id_column:
        lower_map = {col.lower(): col for col in df.columns}
        id_column = lower_map.get("id", "")
    if not id_column:
        raise CSVValidationError("É obrigatório existir uma coluna ID.")

    metadata_columns = [
        col
        for col in df.columns
        if col != id_column and col.strip().lower() in METADATA_CANDIDATES
    ]
    candidate_items = [col for col in df.columns if col not in {id_column, *metadata_columns}]
    item_columns: list[str] = []

    for col in candidate_items:
        series = df[col].dropna().astype(str).str.strip()
        values = set(series.unique().tolist())
        if values.issubset({"0", "1", "0.0", "1.0"}):
            item_columns.append(col)
        else:
            issues.append(
                ValidationIssue(
                    level="warning",
                    message=f"A coluna '{col}' foi tratada como metadado por conter valores não binários.",
                )
            )
            metadata_columns.append(col)

    if not item_columns:
        raise CSVValidationError("Nenhuma coluna de item binário foi encontrada.")

    return id_column, item_columns, metadata_columns, issues


def validate_and_prepare(df: pd.DataFrame) -> tuple[pd.DataFrame, str, list[str], list[str], list[ValidationIssue]]:
    id_column, item_columns, metadata_columns, issues = infer_columns(df)
    prepared = df.copy()

    if prepared[id_column].isna().any():
        raise CSVValidationError("A coluna ID contém valores ausentes.")
    if prepared[id_column].astype(str).duplicated().any():
        issues.append(ValidationIssue(level="warning", message="Há IDs duplicados no arquivo."))

    for col in item_columns:
        prepared[col] = prepared[col].astype(str).str.strip().replace({"1.0": "1", "0.0": "0"})
        invalid = ~prepared[col].isin(["0", "1"])
        if invalid.any():
            raise CSVValidationError(f"A coluna '{col}' contém valores diferentes de 0 e 1.")
        prepared[col] = prepared[col].astype(int)

    return prepared, id_column, item_columns, metadata_columns, issues


def build_preview(
    df: pd.DataFrame,
    separator: str,
    id_column: str,
    item_columns: list[str],
    metadata_columns: list[str],
    issues: list[ValidationIssue],
) -> PreviewResponse:
    rows: list[dict[str, Any]] = df.head(8).where(pd.notna(df), None).to_dict(orient="records")
    return PreviewResponse(
        columns=list(df.columns),
        rows=rows,
        detected_separator=separator,
        id_column=id_column,
        item_columns=item_columns,
        metadata_columns=metadata_columns,
        issues=issues,
    )

