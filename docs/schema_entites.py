#!/usr/bin/env python3
"""Single-page entity schema for Bridge Fund Portal"""

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfgen import canvas

W, H = landscape(A4)

DARK_BLUE = HexColor("#003366")
MED_BLUE = HexColor("#1A5276")
LIGHT_BLUE = HexColor("#D6EAF8")
GOLD = HexColor("#C5A028")
LIGHT_GOLD = HexColor("#FDF6E3")
GREEN = HexColor("#27AE60")
LIGHT_GREEN = HexColor("#E8F8F5")
RED_LIGHT = HexColor("#FADBD8")
PURPLE = HexColor("#6C3483")
LIGHT_PURPLE = HexColor("#F4ECF7")
GRAY = HexColor("#666666")
LIGHT_GRAY = HexColor("#F2F3F4")
WHITE = white

output = "/Users/gauthieralexandrian/Desktop/Swisslife demo/bridge-fund-portal/docs/Schema_Entites_Bridge_Fund.pdf"
c = canvas.Canvas(output, pagesize=landscape(A4))

# ── Background ──
c.setFillColor(white)
c.rect(0, 0, W, H, fill=1)

# ── Header bar ──
c.setFillColor(DARK_BLUE)
c.rect(0, H - 36, W, 36, fill=1)
c.setFillColor(white)
c.setFont("Helvetica-Bold", 14)
c.drawCentredString(W/2, H - 25, "Bridge Fund Portal - Schema des Entites et Flux")
c.setFillColor(GOLD)
c.setFont("Helvetica", 8)
c.drawString(W - 160, H - 25, "Mars 2026 | Confidentiel")

# ── Gold accent line ──
c.setStrokeColor(GOLD)
c.setLineWidth(2)
c.line(0, H - 37, W, H - 37)

# ── Helper functions ──
def draw_box(x, y, w, h, title, items, bg, border, title_bg=None):
    """Draw a rounded box with title bar and bullet items."""
    if title_bg is None:
        title_bg = border
    # Shadow
    c.setFillColor(HexColor("#DDDDDD"))
    c.roundRect(x+2, y-2, w, h, 8, fill=1, stroke=0)
    # Box body
    c.setFillColor(bg)
    c.setStrokeColor(border)
    c.setLineWidth(1.5)
    c.roundRect(x, y, w, h, 8, fill=1, stroke=1)
    # Title bar
    c.setFillColor(title_bg)
    c.roundRect(x, y + h - 22, w, 22, 8, fill=1, stroke=0)
    c.rect(x, y + h - 22, w, 12, fill=1, stroke=0)
    # Title text
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(x + w/2, y + h - 17, title)
    # Items
    c.setFillColor(HexColor("#333333"))
    c.setFont("Helvetica", 7)
    yi = y + h - 35
    for item in items:
        if yi < y + 4:
            break
        c.drawString(x + 8, yi, item)
        yi -= 11

def draw_arrow(x1, y1, x2, y2, label="", color=GRAY, dashed=False):
    """Draw an arrow from (x1,y1) to (x2,y2) with optional label."""
    c.setStrokeColor(color)
    c.setLineWidth(1.2)
    if dashed:
        c.setDash(3, 3)
    else:
        c.setDash()
    c.line(x1, y1, x2, y2)
    c.setDash()
    # Arrowhead
    import math
    angle = math.atan2(y2 - y1, x2 - x1)
    arrow_len = 7
    c.setFillColor(color)
    ax1 = x2 - arrow_len * math.cos(angle - 0.35)
    ay1 = y2 - arrow_len * math.sin(angle - 0.35)
    ax2 = x2 - arrow_len * math.cos(angle + 0.35)
    ay2 = y2 - arrow_len * math.sin(angle + 0.35)
    p = c.beginPath()
    p.moveTo(x2, y2)
    p.lineTo(ax1, ay1)
    p.lineTo(ax2, ay2)
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    # Label
    if label:
        mx = (x1 + x2) / 2
        my = (y1 + y2) / 2
        c.setFillColor(color)
        c.setFont("Helvetica", 6)
        c.drawCentredString(mx, my + 5, label)

def draw_double_arrow(x1, y1, x2, y2, label="", color=GRAY):
    """Draw a double-headed arrow."""
    import math
    c.setStrokeColor(color)
    c.setLineWidth(1.2)
    c.setDash()
    c.line(x1, y1, x2, y2)
    angle = math.atan2(y2 - y1, x2 - x1)
    arrow_len = 7
    c.setFillColor(color)
    # Head at (x2, y2)
    for pt in [(x2, y2)]:
        ax1 = pt[0] - arrow_len * math.cos(angle - 0.35)
        ay1 = pt[1] - arrow_len * math.sin(angle - 0.35)
        ax2 = pt[0] - arrow_len * math.cos(angle + 0.35)
        ay2 = pt[1] - arrow_len * math.sin(angle + 0.35)
        p = c.beginPath()
        p.moveTo(pt[0], pt[1])
        p.lineTo(ax1, ay1)
        p.lineTo(ax2, ay2)
        p.close()
        c.drawPath(p, fill=1, stroke=0)
    # Head at (x1, y1)
    angle2 = angle + 3.14159
    ax1 = x1 - arrow_len * math.cos(angle2 - 0.35)
    ay1 = y1 - arrow_len * math.sin(angle2 - 0.35)
    ax2 = x1 - arrow_len * math.cos(angle2 + 0.35)
    ay2 = y1 - arrow_len * math.sin(angle2 + 0.35)
    p = c.beginPath()
    p.moveTo(x1, y1)
    p.lineTo(ax1, ay1)
    p.lineTo(ax2, ay2)
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    if label:
        mx = (x1 + x2) / 2
        my = (y1 + y2) / 2
        c.setFillColor(color)
        c.setFont("Helvetica", 6)
        c.drawCentredString(mx, my + 5, label)

# ═══════════════════════════════════════
# LAYOUT — 3 rows
# ═══════════════════════════════════════

bw = 145  # box width
bh = 75   # box height
margin_x = 30
margin_y = 25

# ── ROW 1 (top): External entities — Regulateur, Depositaire ──
row1_y = H - 50 - bh - 10

draw_box(margin_x + 50, row1_y, bw, bh,
    "REGULATEUR (CSSF)",
    ["Supervision AIFMD / MiFID2", "Cadre AMLD5", "Juridiction: Luxembourg", "Controle du fonds et de l'AIFM"],
    LIGHT_GOLD, GOLD, GOLD)

draw_box(W - margin_x - bw - 50, row1_y, bw, bh,
    "DEPOSITAIRE",
    ["Garde actifs sous-jacents", "Verification NAV", "Reporting reglementaire", "Controle independant"],
    LIGHT_GOLD, GOLD, GOLD)

# ── ROW 2 (middle): Core actors — Investisseur, AIFM, Intermediaire, Admin ──
row2_y = row1_y - bh - 55
bw2 = 155
bh2 = 85
gap2 = (W - 2*margin_x - 4*bw2) / 3

x_inv = margin_x
x_aifm = margin_x + bw2 + gap2
x_inter = margin_x + 2*(bw2 + gap2)
x_admin = margin_x + 3*(bw2 + gap2)

draw_box(x_inv, row2_y, bw2, bh2,
    "INVESTISSEUR (LP)",
    ["Souscription + KYC", "Recoit security tokens (BF)", "Convertit BF -> sBF (synthetiques)", "Burn sBF -> recupere BF", "Wallet Cardano dedie"],
    LIGHT_BLUE, DARK_BLUE, DARK_BLUE)

draw_box(x_aifm, row2_y, bw2, bh2,
    "AIFM (Gestionnaire)",
    ["Valide les souscriptions", "Declenche le mint des tokens BF", "Controle compliance", "Whitelist / Freeze adresses", "Supervise les fonds"],
    LIGHT_BLUE, MED_BLUE, MED_BLUE)

draw_box(x_inter, row2_y, bw2, bh2,
    "INTERMEDIAIRE (CGP)",
    ["Gere clients investisseurs", "Custody wallet", "Distribue tokens aux clients", "Mint/Burn synthetiques", "pour le compte des clients"],
    LIGHT_BLUE, HexColor("#2C3E50"), HexColor("#2C3E50"))

draw_box(x_admin, row2_y, bw2, bh2,
    "ADMIN (Operateur)",
    ["Deploie fonds on-chain", "Cree comptes utilisateurs", "Configure parametres fonds", "Registry CIP-25 (NFT)", "Gestion globale plateforme"],
    LIGHT_BLUE, HexColor("#1B2631"), HexColor("#1B2631"))

# ── ROW 3 (bottom): Infrastructure — Supabase, Blockchain, Vault, Tokens ──
row3_y = row2_y - bh2 - 55
bw3 = 170
bh3 = 90
gap3 = (W - 2*margin_x - 4*bw3) / 3

x_supa = margin_x
x_chain = margin_x + bw3 + gap3
x_vault = margin_x + 2*(bw3 + gap3)
x_tokens = margin_x + 3*(bw3 + gap3)

draw_box(x_supa, row3_y, bw3, bh3,
    "SUPABASE (Backend)",
    ["PostgreSQL + RLS (Row Level Security)", "Edge Functions (Deno/TypeScript)", "Auth GoTrue (JWT)", "Storage: KYC documents", "Tables: profiles, funds, orders,", "vault_positions, token_transfers", "token_whitelist, token_freeze"],
    LIGHT_GRAY, HexColor("#2E86C1"), HexColor("#2E86C1"))

draw_box(x_chain, row3_y, bw3, bh3,
    "BLOCKCHAIN CARDANO",
    ["Preprod Testnet", "Native Scripts (non Plutus)", "Lucid v0.10.10 + Blockfrost API", "CIP-25 (NFT Registry)", "CIP-113 (Programmable Tokens)", "CIP-674 (Tx Messages)", "3 scripts par fonds"],
    LIGHT_GRAY, HexColor("#1A5276"), HexColor("#1A5276"))

draw_box(x_vault, row3_y, bw3, bh3,
    "VAULT ON-CHAIN",
    ["Script Address dedie par fonds", "Native Script: all + after slot 0", "Lock BF (security tokens)", "Collateral 1:1", "Adresse distincte du wallet", "Depense: admin signature requise"],
    LIGHT_GREEN, GREEN, GREEN)

draw_box(x_tokens, row3_y, bw3, bh3,
    "TOKENS",
    ["Security (BF): whitelist, freeze, cap", "  Policy: native 'all' (admin sig)", "  Asset: FUNDSLUG (ex: BRIDGEFUND)", "", "Synthetic (sBF): libre, 1:1 backed", "  Policy: native 'any'>'all'", "  Asset: sFUNDSLUG (ex: sBRIDGEFUND)"],
    LIGHT_PURPLE, PURPLE, PURPLE)

# ═══════════════════════════════════════
# ARROWS
# ═══════════════════════════════════════

# Regulateur -> AIFM (supervision)
reg_cx = margin_x + 50 + bw/2
reg_bot = row1_y
aifm_cx = x_aifm + bw2/2
aifm_top = row2_y + bh2
draw_arrow(reg_cx + 40, reg_bot, aifm_cx, aifm_top + 5, "Supervision CSSF", GOLD)

# Depositaire <-> AIFM (NAV)
dep_cx = W - margin_x - bw - 50 + bw/2
draw_arrow(dep_cx - 40, row1_y, aifm_cx + 30, aifm_top + 5, "Verification NAV", GOLD)

# Investisseur -> Supabase (souscription)
draw_arrow(x_inv + bw2/2, row2_y, x_supa + bw3/2, row3_y + bh3 + 5, "Souscription + KYC", DARK_BLUE)

# AIFM -> Blockchain (validation + mint)
draw_arrow(x_aifm + bw2/2, row2_y, x_chain + bw3/2, row3_y + bh3 + 5, "Validation -> Mint BF", MED_BLUE)

# Intermediaire -> Vault (mint/burn synthetiques)
draw_arrow(x_inter + bw2/2, row2_y, x_vault + bw3/2, row3_y + bh3 + 5, "Lock BF / Mint sBF", GREEN)

# Admin -> Blockchain (deploy)
draw_arrow(x_admin + bw2/2, row2_y, x_chain + bw3*0.8, row3_y + bh3 + 5, "Deploy Registry", HexColor("#1B2631"))

# Investisseur -> Vault (lock BF -> mint sBF)
draw_arrow(x_inv + bw2, row2_y + 15, x_vault, row3_y + bh3 - 10, "Lock BF -> sBF", GREEN, dashed=True)

# Intermediaire -> Investisseur (distribution tokens)
draw_double_arrow(x_inter, row2_y + bh2/2, x_inv + bw2, row2_y + bh2/2, "Distribution tokens", HexColor("#2C3E50"))

# Supabase <-> Blockchain
draw_double_arrow(x_supa + bw3, row3_y + bh3/2, x_chain, row3_y + bh3/2, "Edge Functions", HexColor("#2E86C1"))

# Blockchain -> Vault
draw_double_arrow(x_chain + bw3, row3_y + bh3/2, x_vault, row3_y + bh3/2, "Lock / Unlock", GREEN)

# Vault -> Tokens
draw_double_arrow(x_vault + bw3, row3_y + bh3/2, x_tokens, row3_y + bh3/2, "Mint / Burn", PURPLE)

# AIFM -> Investisseur (whitelist)
draw_arrow(x_aifm, row2_y + bh2/2, x_inv + bw2, row2_y + bh2/2 + 10, "Whitelist", MED_BLUE, dashed=True)

# Admin -> Supabase (create users/funds)
draw_arrow(x_admin + bw2/2 + 20, row2_y, x_supa + bw3*0.9, row3_y + bh3 + 5, "Create users/funds", HexColor("#1B2631"), dashed=True)

# ── Footer ──
c.setStrokeColor(GOLD)
c.setLineWidth(1)
c.line(margin_x, 22, W - margin_x, 22)
c.setFillColor(GRAY)
c.setFont("Helvetica", 7)
c.drawCentredString(W/2, 10, "Bridge Fund Portal | React 19 + Supabase + Cardano Preprod | CIP-113 Programmable Tokens | Tokens Synthetiques 1:1 | Document Confidentiel - Mars 2026")

# ── Legend (bottom-left) ──
ly = 32
c.setFont("Helvetica", 6)
c.setFillColor(GOLD)
c.drawString(margin_x, ly, "--- Externe (Regulateur/Depositaire)")
c.setFillColor(DARK_BLUE)
c.drawString(margin_x + 140, ly, "--- Acteurs Plateforme")
c.setFillColor(GREEN)
c.drawString(margin_x + 260, ly, "--- Vault / Synthetiques")
c.setFillColor(PURPLE)
c.drawString(margin_x + 380, ly, "--- Tokens (BF / sBF)")

c.save()
print(f"PDF genere: {output}")
