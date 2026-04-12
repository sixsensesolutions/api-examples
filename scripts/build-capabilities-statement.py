#!/usr/bin/env python3
"""Generate one-page Letter capabilities statement PDF for Six Sense Solutions LLC."""

from pathlib import Path

from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Table, TableStyle

PAGE_WIDTH, PAGE_HEIGHT = letter
HEADER_H = 72
FOOTER_H = 40
MARGIN_X = 48
TEAL = HexColor("#2dd4bf")
HEADER_BG = HexColor("#0a0a0a")
BODY_TEXT = HexColor("#1a1a1a")


def draw_header_footer(canvas, doc):
    canvas.saveState()
    # Top header bar
    canvas.setFillColor(HEADER_BG)
    canvas.rect(0, PAGE_HEIGHT - HEADER_H, PAGE_WIDTH, HEADER_H, fill=1, stroke=0)
    canvas.setFillColor(white)
    canvas.setFont("Helvetica-Bold", 17)
    canvas.drawString(MARGIN_X, PAGE_HEIGHT - 46, "SIX SENSE SOLUTIONS LLC")
    canvas.setFillColor(TEAL)
    canvas.setFont("Helvetica-Bold", 10.5)
    label = "CAPABILITIES STATEMENT"
    tw = canvas.stringWidth(label, "Helvetica-Bold", 10.5)
    canvas.drawString(PAGE_WIDTH - MARGIN_X - tw, PAGE_HEIGHT - 46, label)
    # Thin teal rule below header
    canvas.setStrokeColor(TEAL)
    canvas.setLineWidth(1)
    y_rule = PAGE_HEIGHT - HEADER_H
    canvas.line(0, y_rule, PAGE_WIDTH, y_rule)
    # Footer bar
    canvas.setFillColor(HEADER_BG)
    canvas.rect(0, 0, PAGE_WIDTH, FOOTER_H, fill=1, stroke=0)
    canvas.setFillColor(white)
    canvas.setFont("Helvetica", 8.5)
    footer_text = (
        "hello@sixsensesolutions.net | sixsensesolutions.net | Maryland, USA"
    )
    canvas.drawCentredString(PAGE_WIDTH / 2, 14, footer_text)
    canvas.restoreState()


def build_styles():
    base = getSampleStyleSheet()
    section = ParagraphStyle(
        name="Section",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        textColor=TEAL,
        spaceBefore=10,
        spaceAfter=6,
        alignment=TA_LEFT,
    )
    body = ParagraphStyle(
        name="Body",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=BODY_TEXT,
        alignment=TA_JUSTIFY,
        spaceAfter=8,
    )
    bullet = ParagraphStyle(
        name="Bullet",
        parent=body,
        leftIndent=14,
        firstLineIndent=-14,
    )
    subhead_pp = ParagraphStyle(
        name="PastPerf",
        parent=section,
        spaceBefore=6,
    )
    return section, body, bullet, subhead_pp


def main():
    root = Path(__file__).resolve().parents[1]
    out = root / "docs" / "capabilities-statement.pdf"
    out.parent.mkdir(parents=True, exist_ok=True)

    section_style, body_style, bullet_style, subhead_pp = build_styles()

    story = []

    story.append(
        Paragraph(
            "<b>Company Overview</b>",
            section_style,
        )
    )
    story.append(
        Paragraph(
            "Six Sense Solutions LLC is a DevSecOps firm specializing in shift-left credential "
            "security infrastructure. We solve the entropy gap created when developers use insecure "
            "generation methods by providing a NIST-compliant, cryptographically secure credential "
            "generation API. One API call replaces months of internal security development and "
            "produces compliance documentation your auditors can verify immediately.",
            body_style,
        )
    )

    story.append(Paragraph("<b>Core Competencies</b>", section_style))
    core_items = [
        "<b>Secure Credential Generation:</b> Replacing insecure Math.random() patterns with "
        "cryptographically secure, high-entropy credentials using Node.js crypto.randomInt() exclusively",
        "<b>Compliance-as-Code:</b> Automated NIST 800-63B and SOC2-ready audit documentation "
        "generated with every API response, including entropy bits and compliance profile",
        "<b>Shift-Left Security Infrastructure:</b> Native integration into developer workflows and "
        "CI/CD pipelines so security problems are solved at the point of credential creation, "
        "not after audits find them",
        "<b>Zero-Knowledge Architecture:</b> Credentials exist only in memory and in the HTTP "
        "response. Never stored, never logged, never retained",
    ]
    for t in core_items:
        story.append(Paragraph(f"\u2022 {t}", bullet_style))

    story.append(Paragraph("<b>Differentiators</b>", section_style))
    diff_items = [
        "<b>NIST 800-63B Native:</b> The only credential generation API specifically architected "
        "to enforce federal digital identity guidelines at the code level with documented proof per response",
        "<b>Empirical Research Foundation:</b> Product design informed by analysis of 50,000 real "
        "breached credentials, identifying failure patterns that compliance profiles are built to prevent",
        "<b>Sub-10ms Latency:</b> Designed for high-scale microservices and government cloud "
        "environments with reserved concurrency and dead letter queue architecture on AWS Lambda",
    ]
    for t in diff_items:
        story.append(Paragraph(f"\u2022 {t}", bullet_style))

    story.append(Paragraph("<b>Corporate Data</b>", section_style))

    left_lines = [
        "UEI: Pending SAM.gov Activation",
        "CAGE Code: Pending Assignment",
        "DUNS: Not Required (UEI transition)",
        "Entity Type: Limited Liability Company",
        "State of Incorporation: Maryland",
        "Date Founded: March 12, 2025",
    ]
    right_lines = [
        "NAICS Codes: 541519, 541512, 541690",
        "PSC Codes: DJ01, DA01",
        "SAM.gov Status: Registration Submitted, Pending Activation",
        "Primary POC: hello@sixsensesolutions.net",
        "Website: sixsensesolutions.net",
        "API Endpoint: api.sixsensesolutions.net",
    ]
    col_left = "<br/>".join(left_lines)
    col_right = "<br/>".join(right_lines)
    corp_table = Table(
        [
            [
                Paragraph(col_left, body_style),
                Paragraph(col_right, body_style),
            ]
        ],
        colWidths=[(PAGE_WIDTH - 2 * MARGIN_X) / 2 - 6] * 2,
    )
    corp_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(corp_table)

    story.append(Paragraph("<b>Active Contracts / Past Performance:</b>", subhead_pp))
    story.append(
        Paragraph(
            "No current federal contracts. Actively pursuing first government contract and SBIR "
            "Phase I application. Commercial API currently in beta with developer free tier available.",
            body_style,
        )
    )

    doc = SimpleDocTemplate(
        str(out),
        pagesize=letter,
        rightMargin=MARGIN_X,
        leftMargin=MARGIN_X,
        topMargin=HEADER_H + 8,
        bottomMargin=FOOTER_H + 8,
        title="Capabilities Statement",
        author="Six Sense Solutions LLC",
    )
    doc.build(story, onFirstPage=draw_header_footer, onLaterPages=draw_header_footer)
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
