// utils/resendOTP.js
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Public base URL where your backend serves static assets.
// Set BACKEND_URL in .env — e.g. https://api.flanorx.com
const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:8000").replace(/\/+$/, "");

// ─── Email template (dark mode only) ────────────────────────
// Table-based layout for maximum email client compatibility.
// Inline styles carry the base design; media queries polish small screens.
const buildOtpHtml = ({ otp, subject, isReset }) => {
  const heading = isReset ? "Reset your password" : "Verify your email";

  const intro = isReset
    ? "We received a request to reset the password for your Flanorx account. Enter the code below to continue."
    : "Welcome to Flanorx! Use the code below to verify your email and finish setting up your account.";

  const ignoreNote = isReset
    ? "If you didn't request a password reset, you can safely ignore this email — your password won't change until you create a new one."
    : "If you didn't create a Flanorx account, you can safely ignore this email.";

  const preheader = isReset
    ? `Your Flanorx password reset code is ${otp}. It expires in 10 minutes.`
    : `Your Flanorx verification code is ${otp}. It expires in 10 minutes.`;

  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="dark only" />
<meta name="supported-color-schemes" content="dark only" />
<title>${subject}</title>
<!--[if mso]>
<xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
<![endif]-->
<style>
  /* Client resets */
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
  table,td{mso-table-lspace:0;mso-table-rspace:0}
  img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none}
  body{margin:0;padding:0;width:100%!important;height:100%!important;background-color:#0a0f0d!important}
  a{color:#13ec5b}

  /* Force dark even in clients that try to invert */
  :root{color-scheme:dark only;supported-color-schemes:dark only;}

  /* Mobile refinements — card goes nearly edge-to-edge */
  @media (max-width: 480px) {
    .outer-pad   { padding:8px!important; }
    .container   { width:100%!important; border-radius:14px!important; }
    .px          { padding-left:18px!important; padding-right:18px!important; }
    .pt-header   { padding-top:20px!important; }
    .pb-footer   { padding-bottom:24px!important; }
    .h1          { font-size:22px!important; }
    .body-text   { font-size:14px!important; }
    .small-text  { font-size:12px!important; }
    .logo        { height:24px!important; }
    .otp-box     { padding:20px 12px!important; border-radius:12px!important; }
    .otp-code    { font-size:30px!important; line-height:1.15!important; }
    .otp-label   { font-size:10px!important; letter-spacing:1.2px!important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#0a0f0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

  <!-- Preheader (hidden preview text shown next to subject in inbox) -->
  <div style="display:none;font-size:1px;color:#0a0f0d;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${preheader}
    &#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0f0d;">
    <tr>
      <td class="outer-pad" align="center" style="padding:40px 16px;">

        <!-- Card -->
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;width:100%;background-color:#111a17;border:1px solid #1e2b26;border-radius:16px;overflow:hidden;">

          <!-- Top accent bar -->
          <tr>
            <td style="height:4px;background-color:#13ec5b;line-height:4px;font-size:0;">&nbsp;</td>
          </tr>

          <!-- Logo -->
          <tr>
            <td class="px pt-header" align="left" style="padding:28px 40px 0 40px;">
              <img src="${BACKEND_URL}/images/flanorx.png"
                   alt="Flanorx"
                   class="logo"
                   height="28"
                   style="display:block;height:28px;width:auto;border:0;outline:none;text-decoration:none;" />
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td class="px" style="padding:18px 40px 0 40px;">
              <h1 class="h1" style="margin:0;font-size:26px;line-height:1.25;font-weight:700;color:#f1f5f4;letter-spacing:-0.4px;">
                ${heading}
              </h1>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td class="px" style="padding:12px 40px 0 40px;">
              <p class="body-text" style="margin:0;font-size:15px;line-height:1.6;color:#8fa39c;">
                ${intro}
              </p>
            </td>
          </tr>

          <!-- OTP box -->
          <tr>
            <td class="px" style="padding:28px 40px 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="otp-box" align="center"
                      style="background-color:#0c1a13;border:1px solid #1e4d34;border-radius:14px;padding:24px 20px;">
                    <div class="otp-label"
                         style="font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#13ec5b;margin:0 0 10px 0;">
                      Your verification code
                    </div>
                    <div class="otp-code"
                         style="font-size:38px;line-height:1.1;font-weight:800;color:#ffffff;letter-spacing:0.22em;padding-left:0.22em;font-family:'SF Mono','Menlo','Consolas','Courier New',monospace;">
                      ${otp}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Expiry note -->
          <tr>
            <td class="px" style="padding:20px 40px 0 40px;">
              <p class="body-text" style="margin:0;font-size:14px;line-height:1.6;color:#8fa39c;">
                This code expires in <strong style="color:#f1f5f4;font-weight:600;">10 minutes</strong>. For your security, never share it with anyone.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td class="px" style="padding:28px 40px 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-top:1px solid #1e2b26;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Ignore note -->
          <tr>
            <td class="px" style="padding:20px 40px 8px 40px;">
              <p class="small-text" style="margin:0;font-size:13px;line-height:1.6;color:#647a72;">
                ${ignoreNote}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="px pb-footer" style="padding:24px 40px 32px 40px;">
              <p class="small-text" style="margin:0 0 6px 0;font-size:12px;line-height:1.5;color:#647a72;">
                Need help? Contact us at
                <a href="mailto:support@flanorx.com" style="color:#13ec5b;text-decoration:none;font-weight:600;">support@flanorx.com</a>
              </p>
              <p class="small-text" style="margin:0;font-size:12px;line-height:1.5;color:#4a5a54;">
                &copy; ${year} Flanorx. All rights reserved.
              </p>
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

// ─── Public sender ──────────────────────────────────────────
export const sendOtpEmail = async (
  to,
  otp,
  subject = "Email Verification OTP"
) => {
  // Detect reset flow from the subject string your controllers already pass.
  const isReset = /reset|password/i.test(subject);

  const html = buildOtpHtml({ otp, subject, isReset });

  // Plain-text fallback — helps deliverability and screen readers.
  const text = isReset
    ? `Flanorx password reset\n\nYour code: ${otp}\n\nThis code expires in 10 minutes. If you didn't request a password reset, you can ignore this email.`
    : `Flanorx email verification\n\nYour code: ${otp}\n\nThis code expires in 10 minutes. If you didn't create a Flanorx account, you can ignore this email.`;

  try {
    const { data, error } = await resend.emails.send({
      from: "Flanorx <fuel@flanorx.com>",
      to: [to],
      subject,
      html,
      text,
    });

    if (error) throw new Error(error.message);
    return data;
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    throw new Error("Email sending failed");
  }
};