// utils/resendMessage.js
import { Resend } from "resend";

// ─── Resend client ────────────────────────────────────────
const resend = new Resend(process.env.RESEND_API_KEY);

// Sender identity — must be from a Resend‑verified domain (flanorx.com)
const FROM_EMAIL =
  process.env.MESSAGE_FROM_EMAIL || "Flanorx <hello@flanorx.com>";

// Default reply‑to (falls back to the sender if not provided)
const DEFAULT_REPLY_TO =
  process.env.MESSAGE_REPLY_TO || "support@flanorx.com";

// ─── Normalize a single email ─────────────────────────────
const normalizeEmail = (email) => {
  if (!email || typeof email !== "string") return null;
  const trimmed = email.toLowerCase().trim();
  // Minimal sanity check — Resend will reject truly invalid ones anyway
  if (!trimmed.includes("@")) return null;
  return trimmed;
};

// ─── Normalize a list of emails ───────────────────────────
const normalizeRecipients = (to) => {
  if (!to) return [];
  const list = Array.isArray(to) ? to : [to];
  const set = new Set();
  list.forEach((e) => {
    const n = normalizeEmail(e);
    if (n) set.add(n);
  });
  return Array.from(set);
};

// ─── Normalize attachments for Resend ─────────────────────
// Resend accepts: { filename, path } where `path` is a URL or base64
// Cloudinary secure URLs work out of the box.
const normalizeAttachments = (attachments = []) => {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .map((att) => {
      if (!att) return null;
      // Already in Resend format
      if (att.filename && (att.path || att.content)) {
        return {
          filename: att.filename,
          ...(att.path ? { path: att.path } : {}),
          ...(att.content ? { content: att.content } : {}),
        };
      }
      // Cloudinary / multer‑storage‑cloudinary file object
      if (att.originalname && (att.path || att.secure_url)) {
        return {
          filename: att.originalname,
          path: att.path || att.secure_url,
        };
      }
      return null;
    })
    .filter(Boolean);
};

// ─── Build a single Resend email payload ──────────────────
export const buildEmailPayload = ({
  to,
  subject,
  html,
  text,
  attachments,
  replyTo,
  cc,
  bcc,
}) => {
  const recipients = normalizeRecipients(to);

  if (recipients.length === 0) {
    throw new Error("At least one valid recipient email is required");
  }
  if (!subject || !subject.trim()) {
    throw new Error("Subject is required");
  }

  const payload = {
    from: FROM_EMAIL,
    to: recipients,
    subject: subject.trim(),
    replyTo: replyTo || DEFAULT_REPLY_TO,
  };

  // Prefer HTML, fall back to plain text if HTML missing
  if (html && html.trim()) {
    payload.html = html.trim();
    // Always include a plain‑text fallback so inboxes don't flag it
    if (text && text.trim()) {
      payload.text = text.trim();
    }
  } else if (text && text.trim()) {
    payload.text = text.trim();
  } else {
    throw new Error("Message body (HTML or text) is required");
  }

  // Optional cc / bcc
  const ccList = normalizeRecipients(cc);
  const bccList = normalizeRecipients(bcc);
  if (ccList.length > 0) payload.cc = ccList;
  if (bccList.length > 0) payload.bcc = bccList;

  // Attachments
  const atts = normalizeAttachments(attachments);
  if (atts.length > 0) payload.attachments = atts;

  return payload;
};

// ─── Send a single email ──────────────────────────────────
export const sendMessage = async ({
  to,
  subject,
  html,
  text,
  attachments,
  replyTo,
  cc,
  bcc,
}) => {
  const payload = buildEmailPayload({
    to,
    subject,
    html,
    text,
    attachments,
    replyTo,
    cc,
    bcc,
  });

  const { data, error } = await resend.emails.send(payload);

  if (error) {
    const msg =
      typeof error === "string"
        ? error
        : error.message || "Failed to send message";
    throw new Error(msg);
  }

  return data;
};

// ─── Send many emails (each recipient gets their own copy) ─
// Uses Resend's batch API (max 100 per call). Falls back to
// one‑by‑one sends if the batch endpoint isn't available.
export const sendBulkMessages = async (
  recipients,
  messageData,
  batchSize = 100
) => {
  const emails = normalizeRecipients(recipients);

  if (emails.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  let success = 0;
  let failed = 0;
  const errors = [];

  // Resend batch API hard limit is 100 per call
  const safeBatchSize = Math.min(Math.max(batchSize, 1), 100);

  for (let i = 0; i < emails.length; i += safeBatchSize) {
    const batch = emails.slice(i, i + safeBatchSize);

    // Build one payload per recipient so each gets an individual email
    let payloads;
    try {
      payloads = batch.map((email) =>
        buildEmailPayload({ ...messageData, to: email })
      );
    } catch (buildErr) {
      // If payload building fails, mark whole batch as failed
      failed += batch.length;
      errors.push({
        batch: Math.floor(i / safeBatchSize),
        error: buildErr.message,
      });
      continue;
    }

    try {
      const { data, error } = await resend.batch.send(payloads);

      if (error) {
        const msg =
          typeof error === "string"
            ? error
            : error.message || "Batch send failed";
        failed += batch.length;
        errors.push({
          batch: Math.floor(i / safeBatchSize),
          error: msg,
        });
      } else {
        // Resend returns `data.data` (array of { id }) on success
        const sentCount = Array.isArray(data?.data)
          ? data.data.length
          : batch.length;
        success += sentCount;
        failed += batch.length - sentCount;
      }
    } catch (batchErr) {
      // Fallback: send one by one
      for (const payload of payloads) {
        try {
          const { error } = await resend.emails.send(payload);
          if (error) {
            const msg =
              typeof error === "string"
                ? error
                : error.message || "Send failed";
            failed += 1;
            errors.push({ email: payload.to[0], error: msg });
          } else {
            success += 1;
          }
        } catch (singleErr) {
          failed += 1;
          errors.push({ email: payload.to[0], error: singleErr.message });
        }
      }
    }
  }

  return { success, failed, errors };
};

export default sendMessage;