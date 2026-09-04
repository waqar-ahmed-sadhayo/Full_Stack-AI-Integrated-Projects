from __future__ import annotations

import io
from datetime import datetime, timezone

import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.database import get_db, new_id
from app.hdfs import service as hdfs_service
from app.services import analytics_service, anomaly_service, climate_service

REPORT_TYPES = ["climate_trend", "anomaly", "prediction", "regional", "data_processing", "data_quality"]


async def _dataframe_for(report_type: str) -> pd.DataFrame:
    if report_type == "climate_trend":
        rows = await analytics_service.multi_metric_trend("month")
        return pd.DataFrame(rows)
    if report_type == "anomaly":
        rows = await anomaly_service.list_anomalies(limit=500)
        return pd.DataFrame(rows).drop(columns=["_id"], errors="ignore")
    if report_type == "prediction":
        db = get_db()
        rows = await db.get_collection("predictions").find({}, sort=[("created_at", -1)], limit=100)
        return pd.DataFrame(rows).drop(columns=["_id"], errors="ignore")
    if report_type == "regional":
        rows = await analytics_service.regional_comparison("temperature_c")
        return pd.DataFrame(rows)
    if report_type == "data_processing":
        db = get_db()
        rows = await db.get_collection("hadoop_jobs").find({}, sort=[("start_time", -1)], limit=200)
        return pd.DataFrame(rows).drop(columns=["_id"], errors="ignore")
    if report_type == "data_quality":
        db = get_db()
        rows = await db.get_collection("datasets").find({}, sort=[("uploaded_at", -1)], limit=200)
        return pd.DataFrame(rows).drop(columns=["_id", "audit_trail"], errors="ignore")
    raise ValueError(f"Unknown report type {report_type}")


def _render_pdf(title: str, summary: dict, df: pd.DataFrame) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = [Paragraph(title, styles["Title"]), Spacer(1, 12)]
    elements.append(Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", styles["Normal"]))
    elements.append(Spacer(1, 12))

    for key, value in summary.items():
        elements.append(Paragraph(f"<b>{key}:</b> {value}", styles["Normal"]))
    elements.append(Spacer(1, 16))

    if not df.empty:
        display_df = df.head(60).fillna("")
        data = [list(display_df.columns)] + display_df.astype(str).values.tolist()
        table = Table(data, repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTSIZE", (0, 0), (-1, -1), 6.5),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
                ]
            )
        )
        elements.append(table)
    else:
        elements.append(Paragraph("No data available for this report scope.", styles["Normal"]))

    doc.build(elements)
    return buf.getvalue()


async def generate_report(report_type: str, file_format: str, generated_by: str) -> dict:
    if report_type not in REPORT_TYPES:
        raise ValueError(f"Unknown report type: {report_type}")
    df = await _dataframe_for(report_type)
    summary = await climate_service.summary_stats()
    title = f"EarthScape {report_type.replace('_', ' ').title()} Report"

    if file_format == "csv":
        content = df.to_csv(index=False).encode("utf-8")
        ext = "csv"
    elif file_format == "excel":
        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Report")
        content = buf.getvalue()
        ext = "xlsx"
    elif file_format == "pdf":
        content = _render_pdf(title, summary, df)
        ext = "pdf"
    else:
        raise ValueError("format must be one of: csv, excel, pdf")

    report_id = new_id()
    filename = f"{report_type}_{report_id[:8]}.{ext}"
    now = datetime.now(timezone.utc)
    hdfs_meta = hdfs_service.write_file("reports", [f"year={now.year}", f"month={now.month:02d}"], filename, content)

    report_path = (hdfs_meta["path"])
    doc = {
        "_id": report_id,
        "report_type": report_type,
        "format": file_format,
        "filename": filename,
        "row_count": len(df),
        "generated_by": generated_by,
        "generated_at": now.isoformat(),
        "hdfs_path": hdfs_meta["hdfs_path"],
        "local_path": report_path,
        "size_bytes": len(content),
    }
    db = get_db()
    await db.get_collection("reports").insert_one(doc)
    return doc


async def list_reports(limit: int = 100) -> list[dict]:
    db = get_db()
    return await db.get_collection("reports").find({}, sort=[("generated_at", -1)], limit=limit)


async def get_report(report_id: str) -> dict | None:
    db = get_db()
    return await db.get_collection("reports").find_one({"_id": report_id})
