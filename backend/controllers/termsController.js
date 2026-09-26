// controllers/termsController.js
import asyncHandler from "express-async-handler";
import Terms from "../models/termsModel.js";
import User from "../models/userModel.js";
import {
  GRACE_PERIOD_DAYS,
  TERMS_TYPES,
  DEFAULT_TITLES,
  getGraceDeadline,
  getActiveTermsDocuments,
  getPendingTerms,
  buildTermsAcceptances,
  bumpVersion,
} from "../utils/terms.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ─── Public: read the current write-ups ───────────────────────
// The frontend renders whatever this returns. Nothing is hard-coded
// on the client.
const getTerms = asyncHandler(async (req, res) => {
  const { type } = req.query;

  const filter = { isActive: true };
  if (type) filter.type = type;

  const documents = await Terms.find(filter)
    .select("type title content version updateNotice effectiveFrom updatedAt")
    .sort({ type: 1 });

  res.status(200).json({
    gracePeriodDays: GRACE_PERIOD_DAYS,
    documents,
  });
});

// ─── Auth: what does THIS user still owe us? ──────────────────
// The modal calls this on load. It returns everything needed to render:
// full content, the "we updated X" notice, the deadline, and whether
// dismissing is still allowed.
const getTermsStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "termsAccepted termsAcceptedAt termsGraceEndsAt termsAcceptances"
  );

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const documents = await getActiveTermsDocuments();
  const pending = getPendingTerms(user, documents);

  // Self-heal the stored flag if it ever drifts from reality.
  const shouldBeAccepted = pending.length === 0;
  if (user.termsAccepted !== shouldBeAccepted) {
    user.termsAccepted = shouldBeAccepted;
    if (shouldBeAccepted) user.termsGraceEndsAt = null;
    await user.save();
  }

  const now = Date.now();
  const graceEndsAt = user.termsGraceEndsAt || null;
  const msLeft = graceEndsAt ? graceEndsAt.getTime() - now : 0;

  const requiresAcceptance = pending.length > 0;
  const canDismiss = requiresAcceptance && msLeft > 0;
  const isMandatory = requiresAcceptance && !canDismiss;

  res.status(200).json({
    requiresAcceptance,
    isMandatory,
    canDismiss,
    gracePeriodDays: GRACE_PERIOD_DAYS,
    graceEndsAt,
    daysLeft: canDismiss ? Math.ceil(msLeft / MS_PER_DAY) : 0,
    termsAccepted: user.termsAccepted,
    termsAcceptedAt: user.termsAcceptedAt || null,
    // The modal renders straight from this — full write-up + notice.
    pendingDocuments: pending.map((doc) => ({
      type: doc.type,
      title: doc.title,
      content: doc.content,
      version: doc.version,
      effectiveFrom: doc.effectiveFrom,
      updateNotice:
        doc.updateNotice ||
        `${doc.title} has been updated. Please review and accept the new version.`,
    })),
    acceptedVersions: (user.termsAcceptances || []).map((entry) => ({
      type: entry.type,
      version: entry.version,
      acceptedAt: entry.acceptedAt,
    })),
  });
});

// ─── Auth: record the acceptance ──────────────────────────────
const acceptTerms = asyncHandler(async (req, res) => {
  const { accepted, versions } = req.body;

  if (accepted !== true) {
    res.status(400);
    throw new Error(
      "You must accept the Terms of Service and Privacy Policy to continue."
    );
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const documents = await getActiveTermsDocuments();

  // If the client tells us which versions it displayed, make sure they're
  // still current — otherwise the user "accepted" something they never saw.
  if (versions && typeof versions === "object") {
    const stale = documents.filter(
      (doc) => versions[doc.type] && versions[doc.type] !== doc.version
    );

    if (stale.length) {
      res.status(409);
      throw new Error(
        "These documents were updated while you were reading them. Please review the latest version."
      );
    }
  }

  const now = new Date();

  user.termsAcceptances = buildTermsAcceptances(documents, req, now);
  user.termsAccepted = true;
  user.termsAcceptedAt = now;
  user.termsGraceEndsAt = null;

  await user.save();

  res.status(200).json({
    message: "Thank you. Your acceptance has been recorded.",
    termsAccepted: true,
    termsAcceptedAt: now,
    acceptedVersions: documents.map((doc) => ({
      type: doc.type,
      version: doc.version,
    })),
  });
});

// ─── Admin: publish a new version ─────────────────────────────
// This is the "we updated the Privacy Policy" button. It:
//   1. archives the previous version into history
//   2. publishes the new content + version + notice
//   3. flips EVERY user's termsAccepted to false
//   4. gives everyone a fresh 10-day grace window
const updateTerms = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { title, content, version, updateNotice, effectiveFrom, isActive } =
    req.body;

  if (!TERMS_TYPES.includes(type)) {
    res.status(400);
    throw new Error(
      `Invalid document type. Expected one of: ${TERMS_TYPES.join(", ")}.`
    );
  }

  if (!content || !String(content).trim()) {
    res.status(400);
    throw new Error("Content is required.");
  }

  const fallbackTitle = DEFAULT_TITLES[type];
  let document = await Terms.findOne({ type });
  const isFirstPublish = !document;

  if (isFirstPublish) {
    document = new Terms({
      type,
      title: title || fallbackTitle,
      content,
      version: (version && String(version).trim()) || "1.0.0",
      updateNotice:
        updateNotice ||
        `${title || fallbackTitle} has been published. Please review and accept.`,
      effectiveFrom: effectiveFrom || new Date(),
      isActive: isActive !== undefined ? isActive : true,
      updatedBy: req.user._id,
    });
  } else {
    // Archive what was live before overwriting it.
    document.history.push({
      version: document.version,
      title: document.title,
      content: document.content,
      updateNotice: document.updateNotice,
      changedAt: document.updatedAt || new Date(),
      changedBy: document.updatedBy,
    });

    const previousVersion = document.version;

    document.title = title || document.title;
    document.content = content;
    document.version =
      (version && String(version).trim()) || bumpVersion(previousVersion);
    document.updateNotice =
      updateNotice ||
      `${title || document.title} has been updated. Please review and accept the new version.`;
    document.effectiveFrom = effectiveFrom || new Date();
    if (isActive !== undefined) document.isActive = isActive;
    document.updatedBy = req.user._id;
  }

  await document.save();

  // ── Push everyone back to "not accepted" ─────────────────────
  const graceEndsAt = getGraceDeadline();

  const result = await User.updateMany(
    {},
    {
      $set: {
        termsAccepted: false,
        termsGraceEndsAt: graceEndsAt,
      },
      // Drop their old acceptance of this document so it shows as pending.
      $pull: { termsAcceptances: { type } },
    }
  );

  res.status(isFirstPublish ? 201 : 200).json({
    message: isFirstPublish
      ? `${document.title} published. All users must accept it.`
      : `${document.title} updated. All users must accept the new version.`,
    document: {
      type: document.type,
      title: document.title,
      content: document.content,
      version: document.version,
      updateNotice: document.updateNotice,
      effectiveFrom: document.effectiveFrom,
      isActive: document.isActive,
      updatedAt: document.updatedAt,
    },
    usersReset: result.modifiedCount ?? 0,
    gracePeriodDays: GRACE_PERIOD_DAYS,
    graceEndsAt,
  });
});

// ─── Admin: version history ───────────────────────────────────
const getTermsHistory = asyncHandler(async (req, res) => {
  const { type } = req.params;

  if (!TERMS_TYPES.includes(type)) {
    res.status(400);
    throw new Error(
      `Invalid document type. Expected one of: ${TERMS_TYPES.join(", ")}.`
    );
  }

  const document = await Terms.findOne({ type })
    .populate("updatedBy", "name email")
    .populate("history.changedBy", "name email");

  if (!document) {
    res.status(404);
    throw new Error("No document found for that type");
  }

  res.status(200).json({
    type: document.type,
    current: {
      title: document.title,
      content: document.content,
      version: document.version,
      updateNotice: document.updateNotice,
      effectiveFrom: document.effectiveFrom,
      isActive: document.isActive,
      updatedAt: document.updatedAt,
      updatedBy: document.updatedBy,
    },
    history: document.history,
  });
});

export {
  getTerms,
  getTermsStatus,
  acceptTerms,
  updateTerms,
  getTermsHistory,
};