from __future__ import annotations

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.models.schemas import AnalysisResponse


def _fmt(value: float | int | None) -> str:
    if value is None:
        return "N/E"
    if isinstance(value, float):
        return f"{value:.3f}"
    return str(value)


def build_pdf_report(analysis: AnalysisResponse) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.6 * cm,
        leftMargin=1.6 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
        title="Relatório Psicométrico",
    )
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="AcademicTitle",
            parent=styles["Title"],
            textColor=colors.HexColor("#0f2f3f"),
            fontSize=18,
            leading=22,
            spaceAfter=12,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Section",
            parent=styles["Heading2"],
            textColor=colors.HexColor("#176b5d"),
            fontSize=12,
            leading=15,
            spaceBefore=10,
        )
    )

    story = [
        Paragraph("Relatório Acadêmico de Análise Psicométrica", styles["AcademicTitle"]),
        Paragraph(
            "Análise baseada em Teoria Clássica dos Testes e organização S-P para matriz binária de respostas.",
            styles["BodyText"],
        ),
        Spacer(1, 8),
    ]

    g = analysis.globals
    summary = [
        ["Indicador", "Valor"],
        ["Alfa de Cronbach", _fmt(g.cronbach_alpha)],
        ["Média de acertos", _fmt(g.mean_score)],
        ["Percentual médio", f"{g.mean_percent * 100:.1f}%"],
        ["Examinandos", str(g.students_count)],
        ["Itens", str(g.items_count)],
        ["Desvio padrão dos escores", _fmt(g.score_std)],
    ]
    story.extend([Paragraph("Resumo estatístico", styles["Section"]), _table(summary)])

    interpretation = (
        "Valores mais altos de Alfa de Cronbach indicam maior consistência interna do instrumento. "
        "Itens com alta dificuldade p* requerem atenção pedagógica, enquanto correlações ponto-bisserial "
        "positivas sugerem alinhamento entre o item e o escore total. A matriz S-P destaca acertos "
        "inesperados e erros anômalos para análise diagnóstica."
    )
    story.extend([Spacer(1, 8), Paragraph("Interpretação básica", styles["Section"]), Paragraph(interpretation, styles["BodyText"])])

    item_rows = [["Item", "p*", "Discr.", "r_pbi", "D_i"]]
    for item in analysis.items[:18]:
        item_rows.append([
            item.item,
            _fmt(item.difficulty_p_star),
            _fmt(item.discrimination),
            _fmt(item.point_biserial),
            _fmt(item.coefficient_d_i),
        ])
    story.extend([Spacer(1, 8), Paragraph("Indicadores por item", styles["Section"]), _table(item_rows)])

    zone = analysis.sp.zone_counts
    zone_rows = [["Zona S-P", "Frequência"], *[[key, str(value)] for key, value in zone.items()]]
    story.extend([Spacer(1, 8), Paragraph("Matriz zonal", styles["Section"]), _table(zone_rows)])

    if analysis.groups:
        group_rows = [["Variável", "Grupo", "n", "Média", "Alfa"]]
        for group in analysis.groups[:20]:
            group_rows.append([group.variable, group.group, str(group.n), _fmt(group.mean_score), _fmt(group.cronbach_alpha)])
        story.extend([Spacer(1, 8), Paragraph("Comparação entre grupos", styles["Section"]), _table(group_rows)])

    doc.build(story)
    return buffer.getvalue()


def _table(rows: list[list[str]]) -> Table:
    table = Table(rows, hAlign="LEFT", repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f2f3f")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#c7d2d8")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f4f8f8")]),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table

