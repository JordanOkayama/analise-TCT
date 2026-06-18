from io import StringIO

import pandas as pd
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response, StreamingResponse

from app.models.schemas import AnalysisResponse, PreviewResponse
from app.services.csv_parser import CSVValidationError, build_preview, read_csv_upload, validate_and_prepare
from app.services.psychometrics import MatrixContext, analyze_matrix
from app.services.reporting import build_pdf_report

router = APIRouter()


async def _context_from_upload(file: UploadFile) -> MatrixContext:
    raw = await file.read()
    try:
        df, separator = read_csv_upload(raw)
        prepared, id_column, item_columns, metadata_columns, issues = validate_and_prepare(df)
    except CSVValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
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


@router.post("/report/pdf")
async def report_pdf(file: UploadFile = File(...)) -> Response:
    context = await _context_from_upload(file)
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

