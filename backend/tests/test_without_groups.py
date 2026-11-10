from io import BytesIO
import unittest
from unittest.mock import patch

import pdfplumber
from fastapi.testclient import TestClient

from app.main import app
from app.models.schemas import AnalysisResponse, GroupMetric
from app.services.reporting import build_pdf_report


CSV = b"ID;escola;CO_PROVA_MT;i1;i2;i3\n1;A;1471;1;1;1\n2;A;1471;1;1;0\n3;A;1471;1;0;1\n4;B;1471;0;1;0\n5;B;1471;1;0;0\n6;B;1471;0;0;0\n"


class WithoutGroupsTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def upload(self, path, data=None):
        return self.client.post(path, files={"file": ("matriz.csv", CSV, "text/csv")}, data=data)

    def test_analysis_preserves_scores_metadata_and_extreme_discrimination(self):
        with patch("app.services.psychometrics._group_metrics", side_effect=AssertionError("Groups must not run")):
            response = self.upload("/api/analyze")
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result["groups"], [])
        self.assertEqual([row["raw_score"] for row in result["students"]], [3, 2, 2, 1, 1, 0])
        self.assertEqual(result["students"][0]["metadata"]["escola"], "A")
        self.assertIn("CO_PROVA_MT", result["students"][0]["metadata"])
        self.assertEqual(result["items"][0]["coefficient_d_i"], 0.5)
        self.assertEqual(result["globals"]["items_count"], 3)

    def test_filtered_endpoint_also_does_not_compute_groups(self):
        with patch("app.services.psychometrics._group_metrics", side_effect=AssertionError("Groups must not run")):
            response = self.upload("/api/analyze-filtered", {"filters": '{"escola":"A"}'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["groups"], [])

    def test_csv_exports_remain_available_except_groups(self):
        for table in ("items", "students"):
            self.assertEqual(self.upload(f"/api/export/{table}").status_code, 200)
        with patch("app.api.routes.analyze_matrix", side_effect=AssertionError("No processing needed")):
            self.assertEqual(self.upload("/api/export/groups").status_code, 404)

    def test_pdf_has_items_students_and_no_comparison_even_with_old_data(self):
        response = self.upload("/api/report/pdf")
        self.assertEqual(response.status_code, 200)
        with pdfplumber.open(BytesIO(response.content)) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)
        self.assertIn("Indicadores por item", text)
        self.assertIn("Indicadores por estudante", text)
        self.assertIn("1.0.14", text)
        self.assertNotIn("Comparação entre grupos", text)
        analysis = AnalysisResponse.model_validate(self.upload("/api/analyze").json())
        analysis.groups = [GroupMetric(variable="escola", group="A", n=3, mean_score=2, mean_percent=0.67, std_score=1, cronbach_alpha=None)]
        with pdfplumber.open(BytesIO(build_pdf_report(analysis))) as pdf:
            self.assertNotIn("Comparação entre grupos", "\n".join(page.extract_text() or "" for page in pdf.pages))


if __name__ == "__main__":
    unittest.main()
