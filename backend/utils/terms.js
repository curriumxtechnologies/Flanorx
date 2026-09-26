// utils/terms.js
import Terms from "../models/termsModel.js";

export const GRACE_PERIOD_DAYS = 10;

export const TERMS_TYPES = ["terms", "privacy"];

export const DEFAULT_TITLES = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
};

/** Deadline = now + 10 days. */
export const getGraceDeadline = (from = Date.now()) =>
  new Date(from + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

/** Best-effort client IP behind Render/Heroku/nginx proxies. */
export const getClientIp = (req) =>
  (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
  req.ip ||
  req.socket?.remoteAddress ||
  null;

/** All published documents, newest rules first. */
export const getActiveTermsDocuments = () =>
  Terms.find({ isActive: true }).sort({ type: 1 });

/**
 * Which active documents has this user NOT accepted at the current version?
 * This is the single source of truth for "does the modal need to show?".
 */
export const getPendingTerms = (user, documents) => {
  const accepted = new Map(
    (user?.termsAcceptances || []).map((entry) => [entry.type, entry.version])
  );
  return documents.filter((doc) => accepted.get(doc.type) !== doc.version);
};

/** Snapshot of "user accepted these versions right now". */
export const buildTermsAcceptances = (documents, req, acceptedAt = new Date()) => {
  const ip = getClientIp(req);
  const userAgent = req.headers["user-agent"] || null;

  return documents.map((doc) => ({
    type: doc.type,
    version: doc.version,
    acceptedAt,
    ip,
    userAgent,
  }));
};

/** "1.0.0" -> "1.0.1". Falls back to a suffix for non-numeric versions. */
export const bumpVersion = (current = "1.0.0") => {
  const parts = String(current).split(".").map((p) => parseInt(p, 10));
  while (parts.length < 3) parts.push(0);
  if (parts.some(Number.isNaN)) return `${current}-1`;
  parts[2] += 1;
  return parts.join(".");
};