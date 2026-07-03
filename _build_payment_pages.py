# -*- coding: utf-8 -*-
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
base = (ROOT / "payment.html").read_text(encoding="utf-8")

TIER_CSS = """
    body.page-tier-earlybird {
      --lime: #c6ff00;
      --tier-accent: #c6ff00;
      --tier-accent-soft: rgba(198, 255, 0, 0.14);
      --tier-glow: rgba(198, 255, 0, 0.45);
    }
    body.page-tier-student {
      --lime: #5ec8ff;
      --tier-accent: #5ec8ff;
      --tier-accent-soft: rgba(94, 200, 255, 0.14);
      --tier-glow: rgba(94, 200, 255, 0.42);
    }
    body.page-tier-regular {
      --lime: #ffb84d;
      --tier-accent: #ffb84d;
      --tier-accent-soft: rgba(255, 184, 77, 0.12);
      --tier-glow: rgba(255, 184, 77, 0.4);
    }
    body[class*="page-tier-"] .navbar {
      border-bottom-color: color-mix(in srgb, var(--tier-accent) 40%, transparent);
    }
    body[class*="page-tier-"] .nav-logo-mark,
    body[class*="page-tier-"] .nav-home:hover {
      color: var(--tier-accent);
      text-shadow: 0 0 18px var(--tier-glow);
    }
    body[class*="page-tier-"] .nav-safe {
      border-color: color-mix(in srgb, var(--tier-accent) 50%, transparent);
      background: var(--tier-accent-soft);
    }
    body[class*="page-tier-"] .step-badge {
      background: var(--tier-accent);
    }
    body[class*="page-tier-"] .btn-submit {
      background: var(--tier-accent);
      color: #0a0a0a;
    }
    body[class*="page-tier-"] .btn-submit:hover:not(:disabled) {
      filter: brightness(1.06);
      box-shadow: 0 0 24px var(--tier-glow);
    }
    body[class*="page-tier-"] .sum-total {
      border-color: color-mix(in srgb, var(--tier-accent) 45%, transparent);
      background: var(--tier-accent-soft);
    }
    body[class*="page-tier-"] .sum-total-val {
      color: var(--tier-accent);
    }
    body[class*="page-tier-"] .bank-lines span {
      color: var(--tier-accent);
    }
    .tier-plan-card {
      margin-bottom: 20px;
      padding: clamp(18px, 3vw, 24px);
      border-radius: 16px;
      border: 2px solid var(--tier-accent);
      background: linear-gradient(165deg, var(--tier-accent-soft) 0%, #111 48%, #0d0d0d 100%);
      box-shadow: 0 0 28px var(--tier-glow);
    }
    .tier-plan-badge {
      display: inline-flex;
      padding: 8px 16px;
      border-radius: 999px;
      font-size: clamp(0.88rem, 2.2vw, 1rem);
      font-weight: 900;
      margin-bottom: 10px;
    }
    .page-tier-earlybird .tier-plan-badge {
      background: var(--tier-accent);
      color: #0a0a0a;
    }
    .page-tier-student .tier-plan-badge {
      background: rgba(59, 130, 246, 0.22);
      color: #b8e6ff;
      border: 1px solid rgba(94, 200, 255, 0.35);
    }
    .page-tier-regular .tier-plan-badge {
      background: rgba(255, 184, 77, 0.15);
      color: #ffd9a0;
      border: 1px solid rgba(255, 184, 77, 0.35);
    }
    .tier-plan-kicker {
      margin: 0 0 4px;
      font-size: 0.78rem;
      font-weight: 700;
      color: #888;
    }
    .tier-plan-cond {
      margin: 0 0 12px;
      font-size: 0.95rem;
      font-weight: 800;
      color: #e8e8e8;
    }
    .tier-plan-prices {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 10px 14px;
      margin-bottom: 10px;
    }
    .tier-plan-old {
      color: #666;
      text-decoration: line-through;
      font-weight: 700;
    }
    .tier-plan-price {
      font-size: clamp(1.65rem, 4vw, 2.2rem);
      font-weight: 900;
      color: var(--tier-accent);
      letter-spacing: -0.03em;
    }
    .tier-plan-save {
      display: inline-flex;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 800;
      border: 1px solid color-mix(in srgb, var(--tier-accent) 35%, transparent);
      background: var(--tier-accent-soft);
      color: var(--tier-accent);
      margin-bottom: 10px;
    }
    .tier-plan-note {
      margin: 0;
      font-size: 0.84rem;
      color: #888;
      line-height: 1.55;
    }
"""

TIERS = {
    "earlybird": {
        "file": "payment-earlybird.html",
        "title": "얼리버드 결제 신청 | STN 미디어 서포터즈",
        "page_title": "얼리버드 결제 신청",
        "lead": "얼리버드 할인이 적용된 요금으로 신청합니다. 오프라인·온라인 수강 형태를 선택하고 정보를 입력해 주세요.",
        "body_class": "page-tier-earlybird",
        "fixed_tier": "earlybird",
        "badge": "얼리버드 20% 할인",
        "kicker": "기간 한정 특가",
        "cond": "2026년 7월 15일까지 결제 시 적용",
        "old_price": "1,980,000원",
        "price": "1,584,000원",
        "save": "396,000원 절약 (20%)",
        "note": "대학생 할인과 중복 적용되지 않습니다. 마감일 이후 정가가 적용됩니다.",
        "tier_label": "얼리버드 20% 할인 (~7/15)",
        "discount_mode": "earlybird",
    },
    "student": {
        "file": "payment-student.html",
        "title": "대학생 할인 결제 신청 | STN 미디어 서포터즈",
        "page_title": "대학생 할인 결제 신청",
        "lead": "대학생 인증 할인이 적용된 요금으로 신청합니다. 증명서 제출이 필요하며 얼리버드 할인과 중복되지 않습니다.",
        "body_class": "page-tier-student",
        "fixed_tier": "student",
        "badge": "대학생 인증 할인 50%",
        "kicker": "재학생 · 휴학생 대상",
        "cond": "재학·휴학 증명서 인증 시 특별 지원가",
        "old_price": "1,980,000원",
        "price": "990,000원",
        "save": "990,000원 절약 (50%)",
        "note": "국내대학(교) 재학·휴학·졸업유예자 한정. 증명서 미제출 시 할인이 취소될 수 있습니다.",
        "tier_label": "대학생 인증 할인 (50%)",
        "discount_mode": "student",
    },
    "regular": {
        "file": "payment-regular.html",
        "title": "일반 결제 신청 | STN 미디어 서포터즈",
        "page_title": "일반 결제 신청",
        "lead": "정가 요금으로 신청합니다. 오프라인·온라인 수강 형태를 선택하고 정보를 입력해 주세요.",
        "body_class": "page-tier-regular",
        "fixed_tier": "regular",
        "badge": "정가",
        "kicker": "표준 수강료",
        "cond": "얼리버드 마감 이후 또는 일반 신청",
        "old_price": "",
        "price": "1,980,000원",
        "save": "부가세 포함",
        "note": "할인 혜택이 적용되지 않은 정가입니다.",
        "tier_label": "정가 (7/15 이후)",
        "discount_mode": "none",
    },
}


def tier_hero(cfg):
    old = (
        f'<p class="tier-plan-old">{cfg["old_price"]}</p>'
        if cfg["old_price"]
        else ""
    )
    return f"""      <div class="tier-plan-card" aria-label="적용 요금">
        <span class="tier-plan-badge">{cfg["badge"]}</span>
        <p class="tier-plan-kicker">{cfg["kicker"]}</p>
        <p class="tier-plan-cond">{cfg["cond"]}</p>
        <div class="tier-plan-prices">
          {old}
          <p class="tier-plan-price">{cfg["price"]}</p>
        </motion>
        <span class="tier-plan-save">{cfg["save"]}</span>
        <p class="tier-plan-note">{cfg["note"]}</p>
      </div>
""".replace("<motion>", "<div>").replace("</motion>", "</div>")


def build_page(cfg):
    html = base
    html = html.replace("<body>", f'<body class="page-payment {cfg["body_class"]}">', 1)
    html = html.replace(
        "<title>수강료 결제 신청 | STN 미디어 서포터즈</title>",
        f"<title>{cfg['title']}</title>",
        1,
    )
    html = html.replace("    .field {", TIER_CSS + "\n    .field {", 1)
    html = html.replace(
        """        <p class="page-kicker">payment request</p>
        <h1 class="page-title">수강료 결제 신청</h1>
        <p class="page-lead">신청 정보를 확인하신 후 단계별로 입력해 주세요. 결제 신청 후 담당자가 순차적으로 안내드립니다.</p>
      </header>""",
        f"""        <p class="page-kicker">payment request</p>
        <h1 class="page-title">{cfg["page_title"]}</h1>
        <p class="page-lead">{cfg["lead"]}</p>
      </header>
{tier_hero(cfg)}""",
        1,
    )

    html = re.sub(
        r'          <p class="field-label" style="margin-bottom: 10px;">요금 유형 선택.*?'
        r'<p class="field-msg" id="err-tier" role="alert"></p>\s*\n',
        "",
        html,
        count=1,
        flags=re.DOTALL,
    )

    html = html.replace(
        'aria-labelledby="step3-title">\n          <motion class="step-head">\n            <span class="step-badge" aria-hidden="true">STEP 3</span>\n            <h2 class="step-title" id="step3-title">약관 동의</h2>',
        'aria-labelledby="step2-agree-title">\n          <div class="step-head">\n            <span class="step-badge" aria-hidden="true">STEP 2</span>\n            <h2 class="step-title" id="step2-agree-title">약관 동의</h2>',
        1,
    )
    html = html.replace(
        'aria-labelledby="step5-title">\n          <div class="step-head">\n            <span class="step-badge" aria-hidden="true">STEP 5</span>\n            <h2 class="step-title" id="step5-title">최종 결제 금액</h2>',
        'aria-labelledby="step3-amount-title">\n          <div class="step-head">\n            <span class="step-badge" aria-hidden="true">STEP 3</span>\n            <h2 class="step-title" id="step3-amount-title">최종 결제 금액</h2>',
        1,
    )

    dm = cfg["discount_mode"]
    if dm in ("earlybird", "student"):
        html = html.replace('id="sum-row-list" hidden', 'id="sum-row-list"', 1)
        html = html.replace('id="sum-row-discount" hidden', 'id="sum-row-discount"', 1)
        if dm == "student":
            html = html.replace("<span>얼리버드 할인 (20%)</span>", "<span>대학생 할인 (50%)</span>", 1)

    html = html.replace(
        "      var tierRadios = document.querySelectorAll('input[name=\"priceTier\"]');\n"
        "      var errTier = document.getElementById(\"err-tier\");\n"
        "      var priceTiersWrap = document.getElementById(\"price-tiers-wrap\");\n"
        "      var tierEarlybirdWrap = document.getElementById(\"tier-earlybird-wrap\");\n"
        "      var tierEarlybirdRadio = document.getElementById(\"tier-earlybird\");\n"
        "      var tierRegularRadio = document.getElementById(\"tier-regular\");\n",
        f'      var FIXED_TIER = "{cfg["fixed_tier"]}";\n',
        1,
    )

    apply_js = f"""      function getPriceTier() {{
        return FIXED_TIER;
      }}

      function tierLabel() {{
        return "{cfg["tier_label"]}";
      }}

      function applyPriceUi() {{
        var tier = FIXED_TIER;
        if (!sumSupplyEl || !sumVatEl || !sumTotalEl) return;
        var total = PRICE[tier];
        if (!total) return;
        var parts = splitVat(total);
        sumSupplyEl.textContent = formatWon(parts.supply);
        sumVatEl.textContent = formatWon(parts.vat);
        sumTotalEl.textContent = formatWon(parts.total);
        if (sumListRow && sumDiscountRow && sumListEl && sumDiscountEl) {{
          if (tier === "earlybird") {{
            sumListRow.hidden = false;
            sumDiscountRow.hidden = false;
            sumListEl.textContent = formatWon(PRICE.list);
            sumDiscountEl.textContent = "-" + formatWon(PRICE.earlybirdDiscount);
          }} else if (tier === "student") {{
            sumListRow.hidden = false;
            sumDiscountRow.hidden = false;
            sumListEl.textContent = formatWon(PRICE.list);
            sumDiscountEl.textContent = "-" + formatWon(PRICE.list - PRICE.student);
          }} else {{
            sumListRow.hidden = true;
            sumDiscountRow.hidden = true;
          }}
        }}
      }}

      function initFixedTier() {{
        applyPriceUi();
      }}
"""

    html = re.sub(
        r"      function getPriceTier\(\) \{.*?\n      function getApplyType\(\)",
        apply_js + "\n      function getApplyType()",
        html,
        count=1,
        flags=re.DOTALL,
    )

    html = re.sub(
        r"      function validateTier\(\) \{.*?\n      function initPriceTiers\(\) \{.*?\n      \}\n\n      tierRadios\.forEach\(function \(r\) \{.*?\n      \}\);\n",
        "",
        html,
        count=1,
        flags=re.DOTALL,
    )

    html = html.replace(
        """        if (!validateTier()) {
          ok = false;
          firstMsg = firstMsg || "요금 유형을 선택해 주세요.";
        }
""",
        "",
        1,
    )
    html = html.replace("      initPriceTiers();", "      initFixedTier();", 1)
    html = html.replace("escapeHtml(tierLabel(getPriceTier()))", "escapeHtml(tierLabel())", 1)

    return html


for cfg in TIERS.values():
    (ROOT / cfg["file"]).write_text(build_page(cfg), encoding="utf-8")
    print("wrote", cfg["file"])

(ROOT / "payment.html").write_text(build_page(TIERS["regular"]), encoding="utf-8")
print("wrote payment.html")
