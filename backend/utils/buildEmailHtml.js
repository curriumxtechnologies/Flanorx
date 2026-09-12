// utils/buildEmailHtml.js
//
// Dark, editorial email template. Always renders dark — no light-mode
// fallback, no prefers-color-scheme, no client auto-inversion surprises.
//
// CTA: Flanorx green fill with a thin red outline (10% red accent).
//
// Usage:
//   buildEmailHtml({
//     body: "Hi there,\n\nThanks for choosing Flanorx!",
//     subject: "Your Flanorx update",
//     ctaLabel: "View My Orders",
//     ctaUrl: "https://flanorx.com/orders",
//     preheader: "A quick update from Flanorx",
//   })

const BRAND_COLOR = "#13ec5b"; // Flanorx green — accent bar, button, links
const BRAND_DARK = "#13ec5b"; // link color
const RED_ACCENT = "#dc2626"; // used ONLY as a thin 1px outline on the CTA

// Dark palette (used everywhere, always)
const PAGE_BG = "#09090b";
const CARD_BG = "#18181b";
const FOOTER_BG = "#111113";
const BORDER = "#27272a";
const INK = "#fafafa"; // headings / wordmark
const BODY_TEXT = "#d4d4d8";
const MUTED = "#a1a1aa";
const LEGAL = "#71717a";
const CTA_TEXT = "#09090b"; // dark text on green button

const CONTACT_EMAIL = "flanorx1@gmail.com";
const SITE_URL = "https://flanorx.com";
const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

// ─── HTML escape ──────────────────────────────────────────
const escapeHtml = (str) =>
  String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// ─── Auto-link plain URLs (after escaping) ────────────────
const linkify = (escaped) =>
  escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    (url) =>
      `<a href="${url}" target="_blank" style="color: ${BRAND_DARK}; text-decoration: underline; word-break: break-all;">${url}</a>`
  );

// ─── Bullet lines starting with • or - get styled as list items ──
const renderParagraph = (para) => {
  const inner = linkify(escapeHtml(para)).replace(/\n/g, "<br/>");
  return `<p class="email-para" style="margin: 0 0 18px 0; font-size: 15px; line-height: 1.7; color: ${BODY_TEXT}; font-family: ${FONT_STACK};">${inner}</p>`;
};

// ─── Turn a plain-text body into nicely spaced paragraphs ──
// Blank lines = new paragraph. Single newlines inside = <br/>.
const bodyToParagraphs = (body) => {
  const raw = String(body || "").trim();
  if (!raw) return "";

  const paragraphs = raw.split(/\n{2,}/);

  return paragraphs
    .map((para) => {
      const trimmed = para.trim();
      if (!trimmed) return "";

      // Bullet block: every line starts with • or -
      const lines = trimmed.split("\n");
      const isBulletBlock = lines.every((l) =>
        /^\s*[•\-]\s+/.test(l)
      );

      if (isBulletBlock) {
        const items = lines
          .map(
            (l) =>
              `<li style="margin: 0 0 6px 0; padding-left: 4px; font-size: 15px; line-height: 1.65; color: ${BODY_TEXT}; font-family: ${FONT_STACK};">${linkify(
                escapeHtml(l.replace(/^\s*[•\-]\s+/, ""))
              )}</li>`
          )
          .join("");
        return `<ul style="margin: 0 0 18px 0; padding-left: 22px; list-style: disc;">${items}</ul>`;
      }

      return renderParagraph(trimmed);
    })
    .join("");
};

// ═══════════════════════════════════════════════════════════
//  Main builder
// ═══════════════════════════════════════════════════════════
export const buildEmailHtml = ({
  body,
  subject = "Flanorx",
  ctaLabel,
  ctaUrl,
  preheader,
}) => {
  const year = new Date().getFullYear();
  const paragraphs = bodyToParagraphs(body);

  const ctaBlock =
    ctaLabel && ctaUrl
      ? `
        <table role="presentation" class="email-cta-table" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0 4px 0;">
          <tr>
            <td class="email-cta-cell" align="center" bgcolor="${BRAND_COLOR}"
                style="border-radius: 6px; background-color: ${BRAND_COLOR}; border: 1px solid ${RED_ACCENT};">
              <a href="${ctaUrl}" target="_blank" class="email-cta-link"
                 style="display: inline-block; padding: 12px 30px; font-family: ${FONT_STACK}; font-size: 14px; font-weight: 700; color: ${CTA_TEXT}; text-decoration: none; border-radius: 6px; letter-spacing: 0.3px; mso-padding-alt: 12px 30px;">
                ${escapeHtml(ctaLabel)}
              </a>
            </td>
          </tr>
        </table>
      `
      : "";

  const preheaderBlock = preheader
    ? `<div style="display: none; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all; color: transparent;">${escapeHtml(
        preheader
      )}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
  <meta name="color-scheme" content="only dark" />
  <meta name="supported-color-schemes" content="only dark" />
  <title>${escapeHtml(subject)}</title>
  <style type="text/css">
    /* ══════════════════════════════════════════════════════════
       MOBILE REFINEMENTS  (max-width: 620px)
       ══════════════════════════════════════════════════════════ */
    @media only screen and (max-width: 620px) {
      .email-outer  { padding: 16px 8px !important; }

      .email-card {
        border-radius: 0 !important;
        border-left: none !important;
        border-right: none !important;
      }

      .email-px { padding-left: 22px !important; padding-right: 22px !important; }

      .email-header { padding-top: 22px !important; padding-bottom: 16px !important; }
      .email-body   { padding-top: 28px !important; padding-bottom: 30px !important; }
      .email-footer { padding-top: 24px !important; padding-bottom: 26px !important; }

      .email-tagline { display: none !important; }

      .email-stack {
        display: block !important;
        width: 100% !important;
        padding-right: 0 !important;
        text-align: left !important;
      }
      .email-stack-right { padding-top: 18px !important; }

      .email-cta-table { width: 100% !important; }
      .email-cta-cell  { width: 100% !important; }
      .email-cta-link  { display: block !important; }

      .email-para { font-size: 15px !important; line-height: 1.65 !important; margin-bottom: 16px !important; }
    }

    @media only screen and (max-width: 380px) {
      .email-px { padding-left: 18px !important; padding-right: 18px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${PAGE_BG}; font-family: ${FONT_STACK}; -webkit-font-smoothing: antialiased;">
  ${preheaderBlock}

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${PAGE_BG};">
    <tr>
      <td align="center" class="email-outer" style="padding: 40px 16px;">

        <!-- Card -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="780" class="email-card" style="width: 100%; max-width: 780px; background-color: ${CARD_BG}; border-radius: 10px; overflow: hidden; border: 1px solid ${BORDER};">

          <!-- Top accent -->
          <tr>
            <td style="height: 4px; line-height: 4px; font-size: 1px; background-color: ${BRAND_COLOR};">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td class="email-px email-header" style="padding: 30px 56px 22px 56px; border-bottom: 1px solid ${BORDER};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <span style="font-family: ${FONT_STACK}; font-size: 19px; font-weight: 800; color: ${INK}; letter-spacing: 0.2px;">
                      Flanorx
                    </span>
                  </td>
                  <td align="right" class="email-tagline" style="vertical-align: middle;">
                    <span style="font-family: ${FONT_STACK}; font-size: 11px; font-weight: 600; color: ${MUTED}; letter-spacing: 1.4px; text-transform: uppercase;">
                      Fuel &amp; Gas, Delivered
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="email-px email-body" style="padding: 40px 56px 44px 56px;">
              ${paragraphs}
              ${
                ctaBlock
                  ? `<div style="margin-top: 8px;">${ctaBlock}</div>`
                  : ""
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="email-px email-footer" style="background-color: ${FOOTER_BG}; border-top: 1px solid ${BORDER}; padding: 30px 56px 34px 56px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td class="email-stack" style="vertical-align: top; padding-right: 24px;">
                    <p style="margin: 0 0 6px 0; font-family: ${FONT_STACK}; font-size: 12px; font-weight: 700; color: ${INK}; letter-spacing: 0.3px;">
                      Questions?
                    </p>
                    <p style="margin: 0; font-family: ${FONT_STACK}; font-size: 13px; line-height: 1.65; color: ${MUTED};">
                      Just reply to this email, or write to
                      <a href="mailto:${CONTACT_EMAIL}"
                         style="color: ${BRAND_DARK}; text-decoration: none; font-weight: 600;">
                        ${CONTACT_EMAIL}
                      </a>.
                    </p>
                  </td>
                  <td class="email-stack email-stack-right" align="right" style="vertical-align: top; white-space: nowrap;">
                    <p style="margin: 0 0 6px 0; font-family: ${FONT_STACK}; font-size: 12px; font-weight: 700; color: ${INK}; letter-spacing: 0.3px;">
                      Flanorx
                    </p>
                    <p style="margin: 0; font-family: ${FONT_STACK}; font-size: 13px; line-height: 1.65; color: ${MUTED};">
                      <a href="${SITE_URL}" target="_blank" style="color: ${MUTED}; text-decoration: none;">flanorx.com</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top: 22px;">
                    <div style="height: 1px; line-height: 1px; font-size: 1px; background-color: ${BORDER};">&nbsp;</div>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top: 16px;">
                    <p style="margin: 0; font-family: ${FONT_STACK}; font-size: 11px; line-height: 1.6; color: ${LEGAL};">
                      You're receiving this email because of your connection with Flanorx. &copy; ${year} Flanorx. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
</body>
</html>`;
};

export default buildEmailHtml;