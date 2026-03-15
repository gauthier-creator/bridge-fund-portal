#!/usr/bin/env python3
"""Generate Bridge Fund Portal - Global Architecture Schema PDF"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor, white, black, Color
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, Frame, PageTemplate, BaseDocTemplate
)
from reportlab.pdfgen import canvas
from reportlab.platypus.flowables import Flowable
import os

# ── Colors ──
DARK_BLUE = HexColor("#003366")
GOLD = HexColor("#C5A028")
LIGHT_BLUE = HexColor("#E8EEF4")
LIGHT_GOLD = HexColor("#FDF6E3")
MED_BLUE = HexColor("#1A5276")
WHITE = white
BLACK = black
GRAY = HexColor("#666666")
LIGHT_GRAY = HexColor("#F5F5F5")
GREEN = HexColor("#27AE60")
RED = HexColor("#E74C3C")
ORANGE = HexColor("#F39C12")

W, H = A4

# ── Custom Flowables ──

class BoxDiagram(Flowable):
    """Draw a colored box with title and bullet items."""
    def __init__(self, title, items, width, height, bg_color, border_color, title_color=WHITE):
        Flowable.__init__(self)
        self.title = title
        self.items = items
        self.box_width = width
        self.box_height = height
        self.bg_color = bg_color
        self.border_color = border_color
        self.title_color = title_color
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        # Box
        c.setFillColor(self.bg_color)
        c.setStrokeColor(self.border_color)
        c.setLineWidth(1.5)
        c.roundRect(0, 0, self.box_width, self.box_height, 6, fill=1, stroke=1)
        # Title bar
        c.setFillColor(self.border_color)
        c.roundRect(0, self.box_height - 22, self.box_width, 22, 6, fill=1, stroke=0)
        c.rect(0, self.box_height - 22, self.box_width, 11, fill=1, stroke=0)
        # Title text
        c.setFillColor(self.title_color)
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(self.box_width / 2, self.box_height - 17, self.title)
        # Items
        c.setFillColor(BLACK)
        c.setFont("Helvetica", 7)
        y = self.box_height - 36
        for item in self.items:
            if y < 5:
                break
            c.drawString(8, y, item)
            y -= 11


class ArrowFlow(Flowable):
    """Draw a vertical arrow with label."""
    def __init__(self, label, width=100, height=30, color=DARK_BLUE):
        Flowable.__init__(self)
        self.label = label
        self.width = width
        self.height = height
        self.color = color

    def draw(self):
        c = self.canv
        mid = self.width / 2
        c.setStrokeColor(self.color)
        c.setFillColor(self.color)
        c.setLineWidth(2)
        # Arrow line
        c.line(mid, self.height, mid, 8)
        # Arrow head
        c.drawPolygon([mid - 5, 8, mid + 5, 8, mid, 0], fill=1)
        # Label
        c.setFont("Helvetica", 7)
        c.setFillColor(GRAY)
        c.drawCentredString(mid, self.height + 2, self.label)


class HLine(Flowable):
    def __init__(self, width, color=GOLD, thickness=1):
        Flowable.__init__(self)
        self.width = width
        self.color = color
        self.thickness = thickness
        self.height = 2

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thickness)
        self.canv.line(0, 0, self.width, 0)


# ── Page Templates ──

def cover_page(canvas_obj, doc):
    canvas_obj.saveState()
    # Background
    canvas_obj.setFillColor(DARK_BLUE)
    canvas_obj.rect(0, 0, W, H, fill=1)
    # Gold accent bar
    canvas_obj.setFillColor(GOLD)
    canvas_obj.rect(0, H * 0.45, W, 4, fill=1)
    # Title
    canvas_obj.setFillColor(WHITE)
    canvas_obj.setFont("Helvetica-Bold", 32)
    canvas_obj.drawCentredString(W / 2, H * 0.65, "Bridge Fund Portal")
    canvas_obj.setFont("Helvetica", 18)
    canvas_obj.drawCentredString(W / 2, H * 0.58, "Schema d'Architecture Globale")
    # Subtitle
    canvas_obj.setFillColor(GOLD)
    canvas_obj.setFont("Helvetica", 13)
    canvas_obj.drawCentredString(W / 2, H * 0.38, "Infrastructure de Tokenisation de Fonds Regules")
    canvas_obj.drawCentredString(W / 2, H * 0.34, "avec Tokens Synthetiques")
    # Footer
    canvas_obj.setFillColor(HexColor("#AAAAAA"))
    canvas_obj.setFont("Helvetica", 10)
    canvas_obj.drawCentredString(W / 2, 60, "Document Technique Confidentiel - Mars 2026")
    canvas_obj.setFont("Helvetica", 9)
    canvas_obj.drawCentredString(W / 2, 42, "Cardano Blockchain | Supabase | React 19 | CIP-113")
    canvas_obj.restoreState()


def normal_page(canvas_obj, doc):
    canvas_obj.saveState()
    # Header bar
    canvas_obj.setFillColor(DARK_BLUE)
    canvas_obj.rect(0, H - 28, W, 28, fill=1)
    canvas_obj.setFillColor(WHITE)
    canvas_obj.setFont("Helvetica-Bold", 9)
    canvas_obj.drawString(2 * cm, H - 20, "Bridge Fund Portal - Architecture Globale")
    canvas_obj.setFillColor(GOLD)
    canvas_obj.drawRightString(W - 2 * cm, H - 20, f"Page {doc.page}")
    # Footer
    canvas_obj.setStrokeColor(GOLD)
    canvas_obj.setLineWidth(0.5)
    canvas_obj.line(2 * cm, 30, W - 2 * cm, 30)
    canvas_obj.setFillColor(GRAY)
    canvas_obj.setFont("Helvetica", 7)
    canvas_obj.drawCentredString(W / 2, 18, "Document Confidentiel - Bridge Fund Portal - Mars 2026")
    canvas_obj.restoreState()


# ── Styles ──
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'CustomTitle', parent=styles['Title'],
    fontSize=20, textColor=DARK_BLUE, spaceAfter=6,
    fontName='Helvetica-Bold'
)
h1_style = ParagraphStyle(
    'H1', parent=styles['Heading1'],
    fontSize=16, textColor=DARK_BLUE, spaceBefore=12, spaceAfter=8,
    fontName='Helvetica-Bold', borderWidth=0,
    backColor=LIGHT_BLUE, borderPadding=(8, 8, 4, 8)
)
h2_style = ParagraphStyle(
    'H2', parent=styles['Heading2'],
    fontSize=12, textColor=MED_BLUE, spaceBefore=10, spaceAfter=4,
    fontName='Helvetica-Bold'
)
h3_style = ParagraphStyle(
    'H3', parent=styles['Heading3'],
    fontSize=10, textColor=DARK_BLUE, spaceBefore=6, spaceAfter=3,
    fontName='Helvetica-Bold'
)
body_style = ParagraphStyle(
    'Body', parent=styles['Normal'],
    fontSize=9, leading=13, textColor=BLACK,
    fontName='Helvetica', spaceAfter=4
)
body_small = ParagraphStyle(
    'BodySmall', parent=body_style,
    fontSize=8, leading=11
)
bullet_style = ParagraphStyle(
    'Bullet', parent=body_style,
    fontSize=8.5, leading=12, leftIndent=15, bulletIndent=5,
    spaceBefore=1, spaceAfter=1
)
center_style = ParagraphStyle(
    'Center', parent=body_style,
    alignment=TA_CENTER, fontSize=9
)
gold_style = ParagraphStyle(
    'Gold', parent=body_style,
    textColor=GOLD, fontName='Helvetica-Bold', fontSize=10
)
toc_style = ParagraphStyle(
    'TOC', parent=body_style,
    fontSize=11, leading=22, leftIndent=20,
    textColor=DARK_BLUE, fontName='Helvetica'
)
toc_num_style = ParagraphStyle(
    'TOCNum', parent=body_style,
    fontSize=11, leading=22, textColor=GOLD,
    fontName='Helvetica-Bold'
)


def make_table_style(has_header=True):
    s = [
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('LEADING', (0, 0), (-1, -1), 11),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor("#CCCCCC")),
    ]
    if has_header:
        s += [
            ('BACKGROUND', (0, 0), (-1, 0), DARK_BLUE),
            ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
        ]
    return TableStyle(s)


def alt_row_colors(table_data, start_row=1):
    s = []
    for i in range(start_row, len(table_data)):
        if i % 2 == 0:
            s.append(('BACKGROUND', (0, i), (-1, i), LIGHT_GRAY))
        else:
            s.append(('BACKGROUND', (0, i), (-1, i), WHITE))
    return s


def b(text):
    return f"<b>{text}</b>"

def gold(text):
    return f'<font color="#C5A028"><b>{text}</b></font>'

def blue(text):
    return f'<font color="#003366"><b>{text}</b></font>'

def green_check():
    return '<font color="#27AE60"><b>[OK]</b></font>'

def red_cross():
    return '<font color="#E74C3C"><b>[--]</b></font>'

def orange_clock():
    return '<font color="#F39C12"><b>[..]</b></font>'


# ── Build Document ──

output_path = "/Users/gauthieralexandrian/Desktop/Swisslife demo/bridge-fund-portal/docs/Schema_Architecture_Globale_Bridge_Fund.pdf"

doc = BaseDocTemplate(
    output_path,
    pagesize=A4,
    topMargin=1.8 * cm,
    bottomMargin=1.5 * cm,
    leftMargin=1.8 * cm,
    rightMargin=1.8 * cm,
    title="Bridge Fund Portal - Schema Architecture Globale",
    author="Bridge Fund Portal",
    subject="Architecture Technique"
)

usable_width = W - doc.leftMargin - doc.rightMargin

# Page templates
cover_template = PageTemplate(
    id='cover',
    frames=[Frame(0, 0, W, H, id='cover_frame')],
    onPage=cover_page
)
normal_template = PageTemplate(
    id='normal',
    frames=[Frame(
        doc.leftMargin, doc.bottomMargin,
        usable_width, H - doc.topMargin - doc.bottomMargin,
        id='normal_frame'
    )],
    onPage=normal_page
)
doc.addPageTemplates([cover_template, normal_template])

story = []

# ═══════════════════════════════════════════════
# PAGE 1: COVER
# ═══════════════════════════════════════════════
from reportlab.platypus.doctemplate import NextPageTemplate
story.append(NextPageTemplate('normal'))
story.append(PageBreak())

# ═══════════════════════════════════════════════
# PAGE 2: TABLE DES MATIERES
# ═══════════════════════════════════════════════
story.append(Paragraph("Table des Matieres", title_style))
story.append(HLine(usable_width, GOLD, 2))
story.append(Spacer(1, 15))

toc_items = [
    ("1", "Vue d'Ensemble de l'Ecosysteme"),
    ("2", "Architecture Technique (Stack)"),
    ("3", "Flux de Tokenisation - Security Tokens"),
    ("4", "Flux Synthetique - Vault &amp; Collateralisation"),
    ("5", "Smart Contracts - Scripts Natifs Cardano"),
    ("6", "Modele de Donnees (Schema Relationnel)"),
    ("7", "Roles &amp; Permissions (RBAC)"),
    ("8", "Securite &amp; Conformite Reglementaire"),
]

for num, title in toc_items:
    toc_data = [[
        Paragraph(f'<font color="#C5A028"><b>{num}.</b></font>', ParagraphStyle('tn', fontSize=12, fontName='Helvetica-Bold')),
        Paragraph(f'<font color="#003366">{title}</font>', ParagraphStyle('tt', fontSize=12, fontName='Helvetica', leading=16))
    ]]
    t = Table(toc_data, colWidths=[30, usable_width - 40])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, -1), 0.3, HexColor("#DDDDDD")),
    ]))
    story.append(t)

story.append(PageBreak())

# ═══════════════════════════════════════════════
# PAGE 3: VUE D'ENSEMBLE ECOSYSTEME
# ═══════════════════════════════════════════════
story.append(Paragraph("1. Vue d'Ensemble de l'Ecosysteme", h1_style))
story.append(Spacer(1, 6))
story.append(Paragraph(
    "Le Bridge Fund Portal est une plateforme de tokenisation de fonds d'investissement regules "
    "sur la blockchain Cardano. Elle permet la creation, distribution et gestion de security tokens "
    "conformes CIP-113, ainsi que leur conversion en tokens synthetiques librement transferables.",
    body_style
))
story.append(Spacer(1, 8))

# Stakeholder diagram as table
story.append(Paragraph(gold("Parties Prenantes et Interactions"), body_style))
story.append(Spacer(1, 4))

# Top row: Regulateur + Depositaire
top_data = [[
    Paragraph('<font color="#003366"><b>REGULATEUR (CSSF)</b></font><br/><font size="7">Supervision AIFMD/MiFID2<br/>Cadre AMLD5<br/>Luxembourg</font>', body_small),
    Paragraph('<font color="#003366"><b>DEPOSITAIRE</b></font><br/><font size="7">Garde actifs sous-jacents<br/>Verification NAV<br/>Reporting reglementaire</font>', body_small),
]]
t = Table(top_data, colWidths=[usable_width / 2] * 2)
t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (0, 0), HexColor("#F0E6CC")),
    ('BACKGROUND', (1, 0), (1, 0), HexColor("#E8EEF4")),
    ('BOX', (0, 0), (0, 0), 1.5, GOLD),
    ('BOX', (1, 0), (1, 0), 1.5, DARK_BLUE),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
]))
story.append(t)

story.append(Spacer(1, 4))
story.append(Paragraph('<font size="7" color="#666666">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Supervision CSSF ----&gt; AIFM &lt;----&gt; Verification NAV + Garde actifs &lt;---- Depositaire</font>', center_style))
story.append(Spacer(1, 4))

# Core actors row
core_data = [[
    Paragraph('<font color="#FFFFFF"><b>INVESTISSEUR (LP)</b></font><br/><font size="7" color="#E8EEF4">Souscription + KYC<br/>Recoit security tokens (BF)<br/>Convertit en synthetiques (sBF)<br/>Burn sBF pour recuperer BF</font>', body_small),
    Paragraph('<font color="#FFFFFF"><b>AIFM (Gestionnaire)</b></font><br/><font size="7" color="#E8EEF4">Valide souscriptions<br/>Declenche mint tokens<br/>Controle compliance<br/>Whitelist / Freeze</font>', body_small),
    Paragraph('<font color="#FFFFFF"><b>INTERMEDIAIRE</b></font><br/><font size="7" color="#E8EEF4">CGP / Family Office<br/>Gere clients investisseurs<br/>Custody wallet<br/>Distribue tokens + synthetiques</font>', body_small),
    Paragraph('<font color="#FFFFFF"><b>ADMIN (Operateur)</b></font><br/><font size="7" color="#E8EEF4">Deploie fonds on-chain<br/>Cree comptes utilisateurs<br/>Configure parametres<br/>Registry CIP-25</font>', body_small),
]]
t = Table(core_data, colWidths=[usable_width / 4] * 4)
t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (0, 0), MED_BLUE),
    ('BACKGROUND', (1, 0), (1, 0), DARK_BLUE),
    ('BACKGROUND', (2, 0), (2, 0), HexColor("#2C3E50")),
    ('BACKGROUND', (3, 0), (3, 0), HexColor("#1B2631")),
    ('BOX', (0, 0), (-1, -1), 1.5, GOLD),
    ('INNERGRID', (0, 0), (-1, -1), 0.5, GOLD),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
]))
story.append(t)

story.append(Spacer(1, 4))
story.append(Paragraph('<font size="7" color="#666666">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|</font>', body_small))
story.append(Spacer(1, 4))

# Infrastructure row
infra_data = [[
    Paragraph('<font color="#FFFFFF"><b>SUPABASE (Backend)</b></font><br/><font size="7" color="#E8EEF4">PostgreSQL + RLS<br/>Edge Functions (Deno/TS)<br/>Auth GoTrue (JWT)<br/>Storage (KYC docs)</font>', body_small),
    Paragraph('<font color="#FFFFFF"><b>BLOCKCHAIN CARDANO</b></font><br/><font size="7" color="#E8EEF4">Preprod Testnet<br/>Native Scripts (non Plutus)<br/>CIP-25 / CIP-113 / CIP-674<br/>Lucid v0.10.10 + Blockfrost</font>', body_small),
    Paragraph('<font color="#FFFFFF"><b>VAULT ON-CHAIN</b></font><br/><font size="7" color="#E8EEF4">Script Address dedie<br/>Lock BF (security tokens)<br/>Mint sBF (synthetiques)<br/>Collateral 1:1</font>', body_small),
]]
t = Table(infra_data, colWidths=[usable_width / 3] * 3)
t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (0, 0), HexColor("#2E86C1")),
    ('BACKGROUND', (1, 0), (1, 0), HexColor("#1A5276")),
    ('BACKGROUND', (2, 0), (2, 0), HexColor("#C5A028")),
    ('BOX', (0, 0), (-1, -1), 1.5, DARK_BLUE),
    ('INNERGRID', (0, 0), (-1, -1), 0.5, WHITE),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
]))
story.append(t)

story.append(Spacer(1, 10))

# Flux arrows summary
story.append(Paragraph(gold("Flux Principaux"), body_style))
flow_data = [
    ["Flux", "De", "Vers", "Action"],
    ["Souscription", "Investisseur", "Plateforme", "Ordre + KYC upload"],
    ["Validation", "AIFM", "Blockchain", "Validation -> Auto-whitelist -> Mint BF"],
    ["Distribution", "Intermediaire", "Investisseur", "Transfer tokens (custody -> client)"],
    ["Synthetique", "Investisseur", "Vault", "Lock BF -> Mint sBF (atomique)"],
    ["Redemption", "Investisseur", "Vault", "Burn sBF -> Unlock BF (atomique)"],
    ["Supervision", "Regulateur", "AIFM", "Cadre CSSF / AIFMD / MiFID2"],
    ["NAV", "Depositaire", "AIFM", "Verification NAV + garde actifs"],
]
t = Table(flow_data, colWidths=[usable_width * x for x in [0.15, 0.18, 0.18, 0.49]])
ts = make_table_style()
for i in range(1, len(flow_data)):
    ts.add('BACKGROUND', (0, i), (-1, i), LIGHT_GRAY if i % 2 == 0 else WHITE)
t.setStyle(ts)
story.append(t)

story.append(PageBreak())

# ═══════════════════════════════════════════════
# PAGE 4: ARCHITECTURE TECHNIQUE
# ═══════════════════════════════════════════════
story.append(Paragraph("2. Architecture Technique (Stack)", h1_style))
story.append(Spacer(1, 6))

# Layer 1: Frontend
story.append(Paragraph(blue("Layer 1 - Frontend") + " &nbsp; React 19 + Vite 7 + Tailwind CSS v4", h2_style))

fe_data = [
    ["Portail", "Fichier", "Role", "Fonctionnalites cles"],
    ["Investisseur (LP)", "PortailLP.jsx", "investor", "Catalogue fonds, souscription, KYC, wallet, synthetiques"],
    ["Intermediaire", "PortailSwissLife.jsx", "intermediary", "Clients, custody, transfer tokens, mint/burn sBF"],
    ["AIFM", "PortailAIFM.jsx", "aifm", "Validation ordres, mint tokens, whitelist/freeze"],
    ["Admin", "PortailAdmin.jsx", "admin", "Creation fonds, users, deploy registry, config"],
]
t = Table(fe_data, colWidths=[usable_width * x for x in [0.18, 0.22, 0.14, 0.46]])
ts = make_table_style()
for i in range(1, len(fe_data)):
    ts.add('BACKGROUND', (0, i), (-1, i), LIGHT_GRAY if i % 2 == 0 else WHITE)
t.setStyle(ts)
story.append(t)
story.append(Spacer(1, 4))

svc_data = [
    ["Service", "Responsabilite"],
    ["cardanoService.js", "Blockchain: deploy, mint, transfer, synthetic mint/burn, explorer utils"],
    ["orderService.js", "CRUD ordres, validation, upload documents KYC"],
    ["fundService.js", "CRUD fonds, deploiement on-chain"],
    ["profileService.js", "Gestion utilisateurs, clients intermediaires"],
]
t = Table(svc_data, colWidths=[usable_width * 0.3, usable_width * 0.7])
ts = make_table_style()
for i in range(1, len(svc_data)):
    ts.add('BACKGROUND', (0, i), (-1, i), LIGHT_GRAY if i % 2 == 0 else WHITE)
t.setStyle(ts)
story.append(t)

story.append(Spacer(1, 8))

# Layer 2: Backend
story.append(Paragraph(blue("Layer 2 - Backend") + " &nbsp; Supabase (PostgreSQL + Edge Functions + Auth + Storage)", h2_style))

ef_data = [
    ["Edge Function", "Entree", "Sortie", "Description"],
    ["deploy-fund-registry", "fundName, fundSlug", "policyId, txHash", "NFT CIP-25 on-chain par fonds"],
    ["generate-wallet", "userId", "address (Preprod)", "Wallet Cardano unique par user"],
    ["mint-token", "orderId, fundSlug, montant", "txHash, tokenCount", "Mint security tokens BF + CIP-113"],
    ["transfer-token", "toAddress, fundSlug, tokenCount", "txHash", "Transfer whitelist-verifie"],
    ["mint-synthetic", "userAddr, fundSlug, tokenCount", "txHash, vaultAddr", "Atomique: lock BF + mint sBF"],
    ["burn-synthetic", "userAddr, fundSlug, tokenCount", "txHash", "Atomique: burn sBF + unlock BF"],
]
t = Table(ef_data, colWidths=[usable_width * x for x in [0.2, 0.22, 0.22, 0.36]])
ts = make_table_style()
for i in range(1, len(ef_data)):
    ts.add('BACKGROUND', (0, i), (-1, i), LIGHT_GRAY if i % 2 == 0 else WHITE)
t.setStyle(ts)
story.append(t)

story.append(Spacer(1, 4))
story.append(Paragraph("<b>Base de donnees:</b> profiles, funds, orders, order_documents, vault_positions, token_transfers, token_whitelist, token_freeze", body_small))
story.append(Paragraph("<b>Auth:</b> GoTrue JWT | <b>Storage:</b> documents (prive), fund-assets (public) | <b>Securite:</b> RLS + SECURITY DEFINER RPCs", body_small))

story.append(Spacer(1, 8))

# Layer 3: Blockchain
story.append(Paragraph(blue("Layer 3 - Blockchain") + " &nbsp; Cardano Preprod Testnet", h2_style))

bc_data = [
    ["Composant", "Detail"],
    ["Runtime", "Lucid v0.10.10 + Blockfrost API (Preprod)"],
    ["Scripts", "Native Scripts (pas Plutus) - 3 scripts par fonds"],
    ["Security Policy", 'Type "all" -> signature admin | Asset: FUNDSLUG (ex: BRIDGEFUND)'],
    ["Synthetic Policy", 'Type "any" wrapping "all" -> signature admin | Asset: sFUNDSLUG (ex: sBRIDGEFUND)'],
    ["Vault Script", 'Type "all" -> admin sig + after slot 0 | Adresse distincte de lock'],
    ["Standards", "CIP-25 (NFT Registry), CIP-113 (Programmable Tokens), CIP-674 (Tx Messages)"],
]
t = Table(bc_data, colWidths=[usable_width * 0.22, usable_width * 0.78])
ts = make_table_style()
for i in range(1, len(bc_data)):
    ts.add('BACKGROUND', (0, i), (-1, i), LIGHT_GRAY if i % 2 == 0 else WHITE)
t.setStyle(ts)
story.append(t)

story.append(PageBreak())

# ═══════════════════════════════════════════════
# PAGE 5: FLUX TOKENISATION SECURITY TOKENS
# ═══════════════════════════════════════════════
story.append(Paragraph("3. Flux de Tokenisation - Security Tokens", h1_style))
story.append(Spacer(1, 6))

story.append(Paragraph(
    "Le processus de tokenisation transforme une souscription en tokens BF regules sur Cardano, "
    "avec des controles de compliance CIP-113 a chaque etape.",
    body_style
))
story.append(Spacer(1, 8))

steps = [
    ("1", "Creation du Fonds", "Admin", "Deploy Fund Registry (CIP-25 NFT on-chain)\nGenere: policy_id, script_address, tx_hash"),
    ("2", "Souscription Investisseur", "Investisseur / Intermediaire", "Ordre pending + Upload KYC\nStocke dans: orders + order_documents"),
    ("3", "Validation AIFM", "AIFM (Gestionnaire)", "Validation de l'ordre -> status: validated\nAuto-whitelist de l'adresse investisseur"),
    ("4", "Mint Security Tokens", "Edge Function mint-token", "Controles pre-mint CIP-113:\n- check_whitelist(fund_id, address)\n- check_frozen(fund_id, address)\n- check_supply_cap(fund_id, amount)"),
    ("5", "Emission On-Chain", "Blockchain Cardano", "Mint BF-[FUND] via native script\nEnvoi vers wallet investisseur\nMetadonnees CIP-674 (audit trail)"),
    ("6", "Enregistrement", "Supabase", "token_transfers: type=mint, tx_hash\ntoken_whitelist: adresse autorisee\nOrdre mis a jour: token_tx_hash"),
]

step_data = [["Etape", "Action", "Acteur", "Detail"]]
for s in steps:
    step_data.append(list(s))

t = Table(step_data, colWidths=[usable_width * x for x in [0.07, 0.2, 0.22, 0.51]])
ts = make_table_style()
for i in range(1, len(step_data)):
    ts.add('BACKGROUND', (0, i), (-1, i), LIGHT_GRAY if i % 2 == 0 else WHITE)
t.setStyle(ts)
story.append(t)

story.append(Spacer(1, 12))
story.append(Paragraph(gold("Controles CIP-113 (Pre-Mint)"), body_style))
story.append(Spacer(1, 4))

cip_data = [
    ["Controle", "Table / RPC", "Comportement si echec"],
    ["Whitelist", "token_whitelist + check_whitelist()", "Rejet: adresse non autorisee"],
    ["Freeze", "token_freeze + check_frozen()", "Rejet: adresse gelee (compliance)"],
    ["Supply Cap", "funds.supply_cap + check_supply_cap()", "Rejet: depassement plafond emission"],
]
t = Table(cip_data, colWidths=[usable_width * x for x in [0.2, 0.35, 0.45]])
ts = make_table_style()
for i in range(1, len(cip_data)):
    ts.add('BACKGROUND', (0, i), (-1, i), LIGHT_GRAY if i % 2 == 0 else WHITE)
t.setStyle(ts)
story.append(t)

story.append(Spacer(1, 12))

story.append(Paragraph(gold("Schema du Flux"), body_style))
story.append(Spacer(1, 4))

flow_visual = [
    ["Investisseur", "-->", "Souscription + KYC", "-->", "AIFM Validation"],
    ["", "", "", "", ""],
    ["", "", "Mint BF tokens", "<--", "Controles CIP-113"],
    ["", "", "", "", ""],
    ["Wallet Investisseur", "<--", "BF-[FUND] on-chain", "<--", "Edge Function mint-token"],
]
t = Table(flow_visual, colWidths=[usable_width * x for x in [0.2, 0.05, 0.3, 0.05, 0.4]])
t.setStyle(TableStyle([
    ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
    ('FONTSIZE', (0, 0), (-1, -1), 8),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TEXTCOLOR', (0, 0), (0, 0), DARK_BLUE),
    ('TEXTCOLOR', (4, 0), (4, 0), DARK_BLUE),
    ('TEXTCOLOR', (0, 4), (0, 4), DARK_BLUE),
    ('TEXTCOLOR', (4, 4), (4, 4), MED_BLUE),
    ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
    ('FONTNAME', (4, 0), (4, 0), 'Helvetica-Bold'),
    ('FONTNAME', (0, 4), (0, 4), 'Helvetica-Bold'),
    ('TEXTCOLOR', (1, 0), (1, -1), GOLD),
    ('TEXTCOLOR', (3, 0), (3, -1), GOLD),
    ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
    ('FONTNAME', (3, 0), (3, -1), 'Helvetica-Bold'),
    ('BACKGROUND', (0, 0), (-1, 0), LIGHT_BLUE),
    ('BACKGROUND', (0, 2), (-1, 2), LIGHT_GOLD),
    ('BACKGROUND', (0, 4), (-1, 4), LIGHT_BLUE),
    ('BOX', (0, 0), (-1, -1), 1, DARK_BLUE),
]))
story.append(t)

story.append(PageBreak())

# ═══════════════════════════════════════════════
# PAGE 6: FLUX SYNTHETIQUE
# ═══════════════════════════════════════════════
story.append(Paragraph("4. Flux Synthetique - Vault &amp; Collateralisation", h1_style))
story.append(Spacer(1, 4))

story.append(Paragraph(
    "Le mecanisme synthetique s'inspire du modele BlackRock BUIDL: les security tokens regules (BF) sont "
    "verrouilles dans un vault on-chain, et des tokens synthetiques (sBF) librement transferables sont emis 1:1.",
    body_style
))
story.append(Spacer(1, 8))

# Token comparison
story.append(Paragraph(gold("Comparaison Security Token vs Synthetic Token"), body_style))
story.append(Spacer(1, 4))

comp_data = [
    ["Propriete", "Security Token (BF)", "Synthetic Token (sBF)"],
    ["Transferabilite", "Restreinte (whitelist)", "Libre (P2P sans controle)"],
    ["Compliance", "Whitelist + Freeze + Supply Cap", "Aucune restriction post-mint"],
    ["Backing", "Actif sous-jacent du fonds", "1:1 par BF verrouille en vault"],
    ["Mint", "Par AIFM lors validation", "Par investisseur via vault lock"],
    ["Burn", "N/A (token permanent)", "Par investisseur -> unlock BF"],
    ["Asset Name", "FUNDSLUG (ex: BRIDGEFUND)", "sFUNDSLUG (ex: sBRIDGEFUND)"],
    ["Policy", 'Native "all" (admin sig)', 'Native "any">"all" (admin sig)'],
    ["Liquidite", "Faible (marche restreint)", "Elevee (marche ouvert)"],
]
t = Table(comp_data, colWidths=[usable_width * x for x in [0.25, 0.375, 0.375]])
ts = make_table_style()
for i in range(1, len(comp_data)):
    ts.add('BACKGROUND', (0, i), (-1, i), LIGHT_GRAY if i % 2 == 0 else WHITE)
t.setStyle(ts)
story.append(t)

story.append(Spacer(1, 10))

# MINT flow
story.append(Paragraph(blue("MINT - Lock + Mint Atomique"), h2_style))

mint_steps = [
    ["Etape", "Action", "Detail technique"],
    ["1", "Selection fonds + montant", "L'investisseur choisit le fonds et N tokens BF a convertir"],
    ["2", "Appel Edge Function", "mint-synthetic(userAddress, fundSlug, fundId, tokenCount, userId)"],
    ["3a", "Lock BF dans Vault", "Envoi de N tokens BF vers Vault Script Address (native all + after slot 0)"],
    ["3b", "Mint sBF simultane", "Mint de N tokens sBF sous Synthetic Policy (native any > all)"],
    ["3c", "Envoi sBF", "Les N tokens sBF sont envoyes au wallet de l'investisseur"],
    ["4", "Enregistrement DB", "vault_positions: status=locked, lock_tx_hash, security/synthetic_token_count"],
]
t = Table(mint_steps, colWidths=[usable_width * x for x in [0.08, 0.25, 0.67]])
ts = make_table_style()
for i in range(1, len(mint_steps)):
    ts.add('BACKGROUND', (0, i), (-1, i), LIGHT_GRAY if i % 2 == 0 else WHITE)
t.setStyle(ts)
story.append(t)

story.append(Spacer(1, 4))
story.append(Paragraph('<font size="7" color="#666666"><b>Transaction atomique Cardano:</b> Les etapes 3a, 3b et 3c sont executees dans une seule transaction - garantie d\'integrite on-chain.</font>', body_small))

story.append(PageBreak())

# BURN flow
story.append(Paragraph(blue("BURN - Burn + Unlock Atomique"), h2_style))

burn_steps = [
    ["Etape", "Action", "Detail technique"],
    ["1", "Demande redemption", "L'investisseur selectionne une vault_position active (status: locked)"],
    ["2", "Appel Edge Function", "burn-synthetic(userAddress, fundSlug, fundId, tokenCount, vaultPositionId)"],
    ["3a", "Burn sBF", "Destruction de N tokens sBF (retires de la supply)"],
    ["3b", "Unlock BF du Vault", "Les N tokens BF sont liberes du Vault Script Address"],
    ["3c", "Retour BF", "Les N tokens BF sont renvoyes au wallet de l'investisseur"],
    ["4", "Mise a jour DB", "vault_positions: status=unlocked, unlock_tx_hash"],
]
t = Table(burn_steps, colWidths=[usable_width * x for x in [0.08, 0.25, 0.67]])
ts = make_table_style()
for i in range(1, len(burn_steps)):
    ts.add('BACKGROUND', (0, i), (-1, i), LIGHT_GRAY if i % 2 == 0 else WHITE)
t.setStyle(ts)
story.append(t)

story.append(Spacer(1, 10))

# Visual schema
story.append(Paragraph(gold("Schema Vault"), body_style))
story.append(Spacer(1, 4))

vault_visual = [
    [Paragraph('<b>Wallet Investisseur</b><br/><font size="7">Detient: BF + sBF</font>', body_small),
     "",
     Paragraph('<b>VAULT (Script Address)</b><br/><font size="7">Native Script: all + after slot 0<br/>Adresse distincte du wallet admin</font>', body_small),
     "",
     Paragraph('<b>Synthetic Policy</b><br/><font size="7">Native Script: any > all<br/>Mint/Burn sBF</font>', body_small)],
    [Paragraph('<font size="7" color="#C5A028"><b>-- N x BF --&gt;</b></font>', center_style),
     "",
     Paragraph('<font size="7" color="#27AE60"><b>LOCK</b></font>', center_style),
     "",
     Paragraph('<font size="7" color="#C5A028"><b>&lt;-- N x sBF --</b></font>', center_style)],
    [Paragraph('<font size="7" color="#C5A028"><b>&lt;-- N x BF --</b></font>', center_style),
     "",
     Paragraph('<font size="7" color="#E74C3C"><b>UNLOCK</b></font>', center_style),
     "",
     Paragraph('<font size="7" color="#E74C3C"><b>-- BURN sBF --&gt;</b></font>', center_style)],
]
t = Table(vault_visual, colWidths=[usable_width * x for x in [0.25, 0.05, 0.35, 0.05, 0.3]])
t.setStyle(TableStyle([
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('BACKGROUND', (0, 0), (0, 0), LIGHT_BLUE),
    ('BACKGROUND', (2, 0), (2, 0), LIGHT_GOLD),
    ('BACKGROUND', (4, 0), (4, 0), LIGHT_BLUE),
    ('BOX', (0, 0), (0, 0), 1.5, DARK_BLUE),
    ('BOX', (2, 0), (2, 0), 1.5, GOLD),
    ('BOX', (4, 0), (4, 0), 1.5, DARK_BLUE),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
story.append(t)

story.append(PageBreak())

# ═══════════════════════════════════════════════
# PAGE 7: SMART CONTRACTS
# ═══════════════════════════════════════════════
story.append(Paragraph("5. Smart Contracts - Scripts Natifs Cardano", h1_style))
story.append(Spacer(1, 6))

story.append(Paragraph(
    "L'architecture utilise des Native Scripts Cardano (pas Plutus) pour chaque fonds. "
    "Trois scripts distincts sont generes par fonds, chacun avec un policy ID unique.",
    body_style
))
story.append(Spacer(1, 8))

# Script 1: Security
story.append(Paragraph(blue("Script 1: Security Token Policy"), h2_style))
script1_data = [
    ["Parametre", "Valeur"],
    ["Type", '"all" -> requiert signature admin (payment credential)'],
    ["Asset Name", "FUNDSLUG en majuscules (ex: BRIDGEFUND)"],
    ["Policy ID", "Hash 56 chars derive du payment credential admin"],
    ["Controles", "Whitelist, Freeze, Supply Cap (verifies off-chain avant signature)"],
    ["Emission", "Declenchee par AIFM via Edge Function mint-token"],
    ["Transfer", "Uniquement vers adresses whitelistees (verifie pre-signature)"],
]
t = Table(script1_data, colWidths=[usable_width * 0.2, usable_width * 0.8])
ts = make_table_style()
for i in range(1, len(script1_data)):
    ts.add('BACKGROUND', (0, i), (-1, i), LIGHT_GRAY if i % 2 == 0 else WHITE)
t.setStyle(ts)
story.append(t)

story.append(Spacer(1, 8))

# Script 2: Synthetic
story.append(Paragraph(blue("Script 2: Synthetic Token Policy"), h2_style))
script2_data = [
    ["Parametre", "Valeur"],
    ["Type", '"any" wrapping "all" -> signature admin (policy ID differente)'],
    ["Asset Name", '"s" + FUNDSLUG (ex: sBRIDGEFUND)'],
    ["Policy ID", "Distinct de Security Policy (structure any vs all)"],
    ["Propriete", "Librement transferable apres mint (pas de whitelist P2P)"],
    ["Backing", "1:1 par security tokens verrouilles dans le Vault"],
    ["Lifecycle", "Mint lors du lock BF | Burn lors du unlock BF"],
]
t = Table(script2_data, colWidths=[usable_width * 0.2, usable_width * 0.8])
ts = make_table_style()
for i in range(1, len(script2_data)):
    ts.add('BACKGROUND', (0, i), (-1, i), LIGHT_GRAY if i % 2 == 0 else WHITE)
t.setStyle(ts)
story.append(t)

story.append(Spacer(1, 8))

# Script 3: Vault
story.append(Paragraph(blue("Script 3: Vault Script Address"), h2_style))
script3_data = [
    ["Parametre", "Valeur"],
    ["Type", '"all" -> signature admin + "after" slot 0 (time-lock)'],
    ["Adresse", "Script Address distincte du wallet admin"],
    ["Fonction", "Verrouille les security tokens comme collateral"],
    ["Depense", "Uniquement par admin (doit signer pour unlock)"],
    ["Distinction", 'Le "after slot 0" cree une adresse differente du wallet simple'],
]
t = Table(script3_data, colWidths=[usable_width * 0.2, usable_width * 0.8])
ts = make_table_style()
for i in range(1, len(script3_data)):
    ts.add('BACKGROUND', (0, i), (-1, i), LIGHT_GRAY if i % 2 == 0 else WHITE)
t.setStyle(ts)
story.append(t)

story.append(PageBreak())

# CIP-113 compliance
story.append(Paragraph(gold("Conformite CIP-113: 8/10 Features Implementees"), body_style))
story.append(Spacer(1, 4))

ok_p = Paragraph('<font color="#27AE60"><b>OK</b></font>', center_style)
pending_p = Paragraph('<font color="#F39C12"><b>...</b></font>', center_style)
cip113_data = [
    ["Feature", "Status", "Implementation"],
    ["Whitelist", Paragraph('<font color="#27AE60"><b>OK</b></font>', center_style), "token_whitelist table + check_whitelist() RPC"],
    ["Freeze", Paragraph('<font color="#27AE60"><b>OK</b></font>', center_style), "token_freeze table + check_frozen() RPC"],
    ["Supply Cap", Paragraph('<font color="#27AE60"><b>OK</b></font>', center_style), "funds.supply_cap + check_supply_cap() RPC"],
    ["Forced Transfer", Paragraph('<font color="#27AE60"><b>OK</b></font>', center_style), "Admin-signed transfer via Edge Function"],
    ["Token Metadata", Paragraph('<font color="#27AE60"><b>OK</b></font>', center_style), "CIP-25 on-chain (fund registry NFT)"],
    ["Transaction Messages", Paragraph('<font color="#27AE60"><b>OK</b></font>', center_style), "CIP-674 audit trail dans chaque tx"],
    ["Audit Trail", Paragraph('<font color="#27AE60"><b>OK</b></font>', center_style), "token_transfers table (on-chain + off-chain)"],
    ["Synthetic Wrapper", Paragraph('<font color="#27AE60"><b>OK</b></font>', center_style), "sBF tokens 1:1 backed, freely transferable"],
    ["Clawback", Paragraph('<font color="#F39C12"><b>Prevu</b></font>', center_style), "Recuperation forcee de tokens"],
    ["Dividend Distribution", Paragraph('<font color="#F39C12"><b>Prevu</b></font>', center_style), "Distribution de rendements on-chain"],
]
t = Table(cip113_data, colWidths=[usable_width * x for x in [0.2, 0.1, 0.7]])
ts = make_table_style()
for i in range(1, len(cip113_data)):
    ts.add('BACKGROUND', (0, i), (-1, i), LIGHT_GRAY if i % 2 == 0 else WHITE)
t.setStyle(ts)
story.append(t)

story.append(PageBreak())

# ═══════════════════════════════════════════════
# PAGE 8: MODELE DE DONNEES
# ═══════════════════════════════════════════════
story.append(Paragraph("6. Modele de Donnees (Schema Relationnel)", h1_style))
story.append(Spacer(1, 6))

story.append(Paragraph(
    "Base de donnees PostgreSQL geree par Supabase avec Row Level Security (RLS) sur toutes les tables.",
    body_style
))
story.append(Spacer(1, 8))

# Tables
tables_data = [
    ["Table", "PK", "Colonnes cles", "Relations (FK)"],
    ["profiles", "id (uuid)", "email, full_name, role, wallet_address, kyc_status, intermediary_id", "intermediary_id -> profiles.id"],
    ["funds", "id (uuid)", "slug (unique), fund_name, status, nav_per_share, cardano_policy_id, cardano_script_address", "created_by -> profiles.id"],
    ["orders", "id (text)", "fund_id, user_id, intermediary_id, type, status, montant, share_class, payment_method", "fund_id -> funds.id\nuser_id -> profiles.id\nintermediary_id -> profiles.id"],
    ["order_documents", "id (bigint)", "order_id, name, type, storage_path, doc_date", "order_id -> orders.id"],
    ["vault_positions", "id (uuid)", "fund_id, user_id, wallet_address, security_token_count, synthetic_token_count, vault_address, lock_tx_hash, unlock_tx_hash, status", "fund_id -> funds.id\nuser_id -> profiles.id"],
    ["token_transfers", "id (uuid)", "fund_id, from_address, to_address, token_count, transfer_type, tx_hash, policy_id, asset_name", "fund_id -> funds.id"],
    ["token_whitelist", "composite", "fund_id, wallet_address, profile_id, kyc_status", "fund_id -> funds.id\nprofile_id -> profiles.id"],
    ["token_freeze", "composite", "fund_id, wallet_address, reason, frozen_by", "fund_id -> funds.id\nfrozen_by -> profiles.id"],
]
t = Table(tables_data, colWidths=[usable_width * x for x in [0.14, 0.1, 0.46, 0.3]])
ts = make_table_style()
for i in range(1, len(tables_data)):
    ts.add('BACKGROUND', (0, i), (-1, i), LIGHT_GRAY if i % 2 == 0 else WHITE)
t.setStyle(ts)
story.append(t)

story.append(Spacer(1, 12))

# RPC Functions
story.append(Paragraph(gold("Fonctions RPC (SECURITY DEFINER)"), body_style))
story.append(Spacer(1, 4))

rpc_data = [
    ["Fonction", "Description", "Usage"],
    ["validate_order(order_id)", "Transition ordre -> validated + auto-whitelist", "Appelee par AIFM"],
    ["check_whitelist(fund_id, addr)", "Verifie si adresse est autorisee", "Pre-mint / pre-transfer"],
    ["check_frozen(fund_id, addr)", "Verifie si adresse est gelee", "Pre-mint / pre-transfer"],
    ["check_supply_cap(fund_id, amount)", "Verifie plafond d'emission", "Pre-mint"],
    ["auto_whitelist_address(...)", "Ajoute adresse post-KYC", "Post-validation"],
    ["link_client_to_intermediary(...)", "Creation client intermediaire", "Portail intermediaire"],
    ["list_my_clients()", "Liste clients de l'intermediaire", "Portail intermediaire"],
]
t = Table(rpc_data, colWidths=[usable_width * x for x in [0.3, 0.4, 0.3]])
ts = make_table_style()
for i in range(1, len(rpc_data)):
    ts.add('BACKGROUND', (0, i), (-1, i), LIGHT_GRAY if i % 2 == 0 else WHITE)
t.setStyle(ts)
story.append(t)

story.append(Spacer(1, 12))

# ER Diagram (text-based)
story.append(Paragraph(gold("Schema Relationnel (Diagramme ER)"), body_style))
story.append(Spacer(1, 4))

er_visual = [
    [Paragraph('<font size="7"><b>profiles</b><br/>id | email | role<br/>wallet_address</font>', body_small),
     Paragraph('<font size="7">1 ---&gt; N</font>', center_style),
     Paragraph('<font size="7"><b>orders</b><br/>id | fund_id | user_id<br/>status | montant</font>', body_small),
     Paragraph('<font size="7">1 ---&gt; N</font>', center_style),
     Paragraph('<font size="7"><b>order_documents</b><br/>id | order_id<br/>storage_path</font>', body_small)],
    ["", "", "", "", ""],
    [Paragraph('<font size="7">1 ---&gt; N</font>', center_style),
     "",
     Paragraph('<font size="7">N &lt;--- 1</font>', center_style),
     "", ""],
    ["", "", "", "", ""],
    [Paragraph('<font size="7"><b>vault_positions</b><br/>id | fund_id | user_id<br/>status | lock_tx_hash</font>', body_small),
     "",
     Paragraph('<font size="7"><b>funds</b><br/>id | slug | fund_name<br/>cardano_policy_id</font>', body_small),
     Paragraph('<font size="7">1 ---&gt; N</font>', center_style),
     Paragraph('<font size="7"><b>token_transfers</b><br/>id | fund_id | tx_hash<br/>transfer_type</font>', body_small)],
    ["", "", "", "", ""],
    [Paragraph('<font size="7"><b>token_whitelist</b><br/>fund_id | wallet_address<br/>profile_id | kyc_status</font>', body_small),
     "",
     Paragraph('<font size="7"><b>token_freeze</b><br/>fund_id | wallet_address<br/>reason | frozen_by</font>', body_small),
     "", ""],
]
t = Table(er_visual, colWidths=[usable_width * x for x in [0.22, 0.1, 0.26, 0.1, 0.32]])
t.setStyle(TableStyle([
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('BACKGROUND', (0, 0), (0, 0), LIGHT_BLUE),
    ('BACKGROUND', (2, 0), (2, 0), LIGHT_BLUE),
    ('BACKGROUND', (4, 0), (4, 0), LIGHT_BLUE),
    ('BACKGROUND', (0, 4), (0, 4), LIGHT_GOLD),
    ('BACKGROUND', (2, 4), (2, 4), LIGHT_BLUE),
    ('BACKGROUND', (4, 4), (4, 4), LIGHT_BLUE),
    ('BACKGROUND', (0, 6), (0, 6), LIGHT_GOLD),
    ('BACKGROUND', (2, 6), (2, 6), LIGHT_GOLD),
    ('BOX', (0, 0), (0, 0), 1, DARK_BLUE),
    ('BOX', (2, 0), (2, 0), 1, DARK_BLUE),
    ('BOX', (4, 0), (4, 0), 1, DARK_BLUE),
    ('BOX', (0, 4), (0, 4), 1, GOLD),
    ('BOX', (2, 4), (2, 4), 1, DARK_BLUE),
    ('BOX', (4, 4), (4, 4), 1, DARK_BLUE),
    ('BOX', (0, 6), (0, 6), 1, GOLD),
    ('BOX', (2, 6), (2, 6), 1, GOLD),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
]))
story.append(t)

story.append(PageBreak())

# ═══════════════════════════════════════════════
# PAGE 9: ROLES & PERMISSIONS
# ═══════════════════════════════════════════════
story.append(Paragraph("7. Roles &amp; Permissions (RBAC)", h1_style))
story.append(Spacer(1, 6))

story.append(Paragraph(
    "Quatre roles distincts avec Row Level Security (RLS) sur toutes les tables. "
    "Chaque portail est dedie a un role specifique.",
    body_style
))
story.append(Spacer(1, 8))

def _ok(extra=""):
    t = "OUI" + (f" {extra}" if extra else "")
    return Paragraph(f'<font color="#27AE60"><b>{t}</b></font>', center_style)

def _no():
    return Paragraph('<font color="#E74C3C"><b>--</b></font>', center_style)

rbac_data = [
    ["Fonctionnalite", "Investisseur", "Intermediaire", "AIFM", "Admin"],
    ["Consulter les fonds", _ok(), _ok(), _ok(), _ok()],
    ["Souscrire a un fonds", _ok(), _ok("(clients)"), _no(), _no()],
    ["Upload KYC", _ok(), _ok("(clients)"), _no(), _no()],
    ["Valider ordres", _no(), _no(), _ok(), _no()],
    ["Rejeter ordres", _no(), _no(), _ok(), _no()],
    ["Declencher mint tokens", _no(), _no(), _ok("(validation)"), _no()],
    ["Transferer tokens", _no(), _ok("(custody)"), _no(), _no()],
    ["Mint synthetiques (sBF)", _ok(), _ok("(clients)"), _no(), _no()],
    ["Burn synthetiques (sBF)", _ok(), _ok("(clients)"), _no(), _no()],
    ["Creer fonds", _no(), _no(), _no(), _ok()],
    ["Deployer on-chain", _no(), _no(), _no(), _ok()],
    ["Creer utilisateurs", _no(), _no(), _no(), _ok()],
    ["Whitelist adresses", _no(), _no(), _ok(), _ok()],
    ["Freeze adresses", _no(), _no(), _ok(), _ok()],
    ["Gerer clients", _no(), _ok(), _no(), _no()],
    ["Vue dashboard global", _no(), _no(), _ok(), _ok()],
]
t = Table(rbac_data, colWidths=[usable_width * x for x in [0.28, 0.18, 0.18, 0.18, 0.18]])
ts = make_table_style()
for i in range(1, len(rbac_data)):
    ts.add('BACKGROUND', (0, i), (-1, i), LIGHT_GRAY if i % 2 == 0 else WHITE)
ts.add('ALIGN', (1, 0), (-1, -1), 'CENTER')
t.setStyle(ts)
story.append(t)

story.append(Spacer(1, 12))

# RLS detail
story.append(Paragraph(gold("Politiques RLS (Row Level Security)"), body_style))
story.append(Spacer(1, 4))

rls_data = [
    ["Table", "Investisseur", "Intermediaire", "AIFM / Admin"],
    ["profiles", "Propre profil uniquement", "Propre profil + clients", "Tous les profils"],
    ["orders", "Propres ordres", "Ordres de ses clients", "Tous les ordres"],
    ["order_documents", "Propres documents", "Documents de ses clients", "Tous les documents"],
    ["funds", "Fonds actifs (lecture)", "Fonds actifs (lecture)", "Tous les fonds (CRUD)"],
    ["vault_positions", "Propres positions", "Positions de ses clients", "Toutes les positions"],
    ["token_transfers", "Propres transfers", "Transfers de ses clients", "Tous les transfers"],
    ["token_whitelist", "Lecture seule (propre)", "Lecture seule (clients)", "CRUD complet"],
    ["token_freeze", "Aucun acces", "Aucun acces", "CRUD complet"],
]
t = Table(rls_data, colWidths=[usable_width * x for x in [0.18, 0.27, 0.27, 0.28]])
ts = make_table_style()
for i in range(1, len(rls_data)):
    ts.add('BACKGROUND', (0, i), (-1, i), LIGHT_GRAY if i % 2 == 0 else WHITE)
t.setStyle(ts)
story.append(t)

story.append(PageBreak())

# ═══════════════════════════════════════════════
# PAGE 10: SECURITE & CONFORMITE
# ═══════════════════════════════════════════════
story.append(Paragraph("8. Securite &amp; Conformite Reglementaire", h1_style))
story.append(Spacer(1, 6))

# Security architecture
story.append(Paragraph(blue("Architecture de Securite"), h2_style))

sec_data = [
    ["Couche", "Mecanisme", "Detail"],
    ["Cles privees", "Edge Functions uniquement", "Seed phrase jamais expose au frontend, signe cote serveur via Lucid"],
    ["Authentification", "Supabase GoTrue (JWT)", "Tokens JWT avec role encode, session persistante"],
    ["Autorisation", "RLS PostgreSQL", "Row Level Security sur toutes les tables, filtre par auth.uid()"],
    ["Operations cross-role", "SECURITY DEFINER RPCs", "Fonctions PL/pgSQL bypassent RLS de maniere controlee"],
    ["Compliance tokens", "CIP-113 off-chain checks", "Whitelist + Freeze + Supply Cap verifies avant signature"],
    ["Audit trail", "Double enregistrement", "On-chain (CIP-674 tx messages) + Off-chain (token_transfers table)"],
    ["Stockage documents", "Supabase Storage (prive)", "Bucket 'documents' avec acces RLS par ordre"],
    ["Blockchain", "Native Scripts Cardano", "Transactions signees serveur-side, verifiables on-chain"],
]
t = Table(sec_data, colWidths=[usable_width * x for x in [0.18, 0.25, 0.57]])
ts = make_table_style()
for i in range(1, len(sec_data)):
    ts.add('BACKGROUND', (0, i), (-1, i), LIGHT_GRAY if i % 2 == 0 else WHITE)
t.setStyle(ts)
story.append(t)

story.append(Spacer(1, 12))

# Regulatory framework
story.append(Paragraph(blue("Cadre Reglementaire"), h2_style))

reg_data = [
    ["Regulation", "Acronyme", "Application dans Bridge Fund Portal"],
    ["Alternative Investment Fund\nManagers Directive", "AIFMD", "Structure SCSp luxembourgeoise, AIFM agree,\nvalidation des souscriptions par le gestionnaire"],
    ["Markets in Financial\nInstruments Directive II", "MiFID2", "KYC obligatoire avant souscription,\nclassification investisseur (professionnel/averti)"],
    ["Anti-Money Laundering\nDirective 5", "AMLD5", "Whitelist KYC-gated, freeze pour compliance,\naudit trail complet (on-chain + off-chain)"],
    ["Commission de Surveillance\ndu Secteur Financier", "CSSF", "Regulateur luxembourgeois,\nsupervision du fonds et de l'AIFM"],
    ["CIP-113 Programmable\nTokens", "CIP-113", "Standard Cardano pour tokens regules:\n8/10 features implementees"],
]
t = Table(reg_data, colWidths=[usable_width * x for x in [0.25, 0.12, 0.63]])
ts = make_table_style()
for i in range(1, len(reg_data)):
    ts.add('BACKGROUND', (0, i), (-1, i), LIGHT_GRAY if i % 2 == 0 else WHITE)
t.setStyle(ts)
story.append(t)

story.append(Spacer(1, 12))

# Structure juridique
story.append(Paragraph(gold("Structure Juridique"), body_style))
story.append(Spacer(1, 4))

jurid_data = [
    ["Element", "Detail"],
    ["Forme juridique", "SCSp (Societe en Commandite Speciale) de droit luxembourgeois"],
    ["Regulateur", "CSSF (Commission de Surveillance du Secteur Financier)"],
    ["AIFM", "Gestionnaire agree AIFMD - valide souscriptions et compliance"],
    ["Depositaire", "Garde des actifs sous-jacents, verification NAV"],
    ["Intermediaires", "CGP / Family Offices - distribution et custody pour clients"],
    ["Investisseurs", "LP (Limited Partners) - professionnels et averti"],
    ["Blockchain", "Cardano Preprod (testnet) - migration mainnet prevue"],
    ["Tokens", "Security tokens (BF) regules + Synthetic tokens (sBF) liquides"],
]
t = Table(jurid_data, colWidths=[usable_width * 0.2, usable_width * 0.8])
ts = make_table_style()
for i in range(1, len(jurid_data)):
    ts.add('BACKGROUND', (0, i), (-1, i), LIGHT_GRAY if i % 2 == 0 else WHITE)
t.setStyle(ts)
story.append(t)

story.append(Spacer(1, 20))

# Final footer
story.append(HLine(usable_width, GOLD, 2))
story.append(Spacer(1, 8))
story.append(Paragraph(
    '<font color="#003366"><b>Bridge Fund Portal</b></font> - '
    'Plateforme de tokenisation de fonds regules sur Cardano<br/>'
    '<font color="#666666" size="8">React 19 | Supabase | Cardano | CIP-113 | Native Scripts | Tokens Synthetiques</font>',
    center_style
))

# ── Build ──
doc.build(story)
print(f"PDF genere: {output_path}")
