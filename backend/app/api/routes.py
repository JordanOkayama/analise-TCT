import json
from io import StringIO

import pandas as pd
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response, StreamingResponse

from app.models.schemas import AnalysisResponse, PreviewResponse
from app.services.csv_parser import (
    CSVValidationError,
    build_preview,
    normalize_lookup_value,
    read_csv_upload,
    validate_and_prepare,
)
from app.services.psychometrics import MatrixContext, analyze_matrix
from app.services.reporting import build_pdf_report

router = APIRouter()


def _parse_filters(filters: str | None) -> dict[str, str]:
    if not filters:
        return {}
    try:
        parsed = json.loads(filters)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=422, detail="Filtros em formato inválido.") from exc
    if not isinstance(parsed, dict):
        raise HTTPException(status_code=422, detail="Filtros devem ser enviados como objeto JSON.")
    selected: dict[str, str] = {}
    for key, value in parsed.items():
        normalized = normalize_lookup_value(value)
        if normalized:
            selected[str(key)] = normalized
    return selected


async def _context_from_upload(file: UploadFile, filters: str | None = None) -> MatrixContext:
    raw = await file.read()
    try:
        df, separator = read_csv_upload(raw)
        prepared, id_column, item_columns, metadata_columns, issues = validate_and_prepare(df)
    except CSVValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    selected_filters = _parse_filters(filters)
    if selected_filters:
        invalid_columns = [column for column in selected_filters if column not in metadata_columns]
        if invalid_columns:
            raise HTTPException(
                status_code=422,
                detail=f"Colunas de filtro inválidas: {', '.join(invalid_columns)}.",
            )
        for column, value in selected_filters.items():
            prepared = prepared[prepared[column].map(normalize_lookup_value) == value]
        if prepared.empty:
            raise HTTPException(status_code=422, detail="Nenhum examinando encontrado para os filtros selecionados.")

    return MatrixContext(
        df=prepared,
        separator=separator,
        id_column=id_column,
        item_columns=item_columns,
        metadata_columns=metadata_columns,
        issues=issues,
    )


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "psicoedu-analytics"}


@router.post("/preview", response_model=PreviewResponse)
async def preview_csv(file: UploadFile = File(...)) -> PreviewResponse:
    context = await _context_from_upload(file)
    return build_preview(
        context.df,
        context.separator,
        context.id_column,
        context.item_columns,
        context.metadata_columns,
        context.issues,
    )


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_csv(file: UploadFile = File(...)) -> AnalysisResponse:
    context = await _context_from_upload(file)
    return analyze_matrix(context)


@router.post("/analyze-filtered", response_model=AnalysisResponse)
async def analyze_filtered_csv(file: UploadFile = File(...), filters: str | None = Form(None)) -> AnalysisResponse:
    context = await _context_from_upload(file, filters)
    return analyze_matrix(context)


@router.post("/report/pdf")
async def report_pdf(file: UploadFile = File(...), filters: str | None = Form(None)) -> Response:
    context = await _context_from_upload(file, filters)
    analysis = analyze_matrix(context)
    pdf = build_pdf_report(analysis)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="relatorio-psicometrico.pdf"'},
    )


@router.post("/export/{table_name}")
async def export_table(table_name: str, file: UploadFile = File(...)) -> StreamingResponse:
    context = await _context_from_upload(file)
    analysis = analyze_matrix(context)
    mapping = {
        "items": [item.model_dump() for item in analysis.items],
        "students": [student.model_dump() for student in analysis.students],
        "groups": [group.model_dump() for group in analysis.groups],
    }
    if table_name not in mapping:
        raise HTTPException(status_code=404, detail="Tabela não disponível para exportação.")
    frame = pd.json_normalize(mapping[table_name])
    output = StringIO()
    frame.to_csv(output, index=False)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{table_name}.csv"'},
    )
