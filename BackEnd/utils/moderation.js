const AWS = require("aws-sdk");
require("dotenv").config();

const rekognition = new AWS.Rekognition({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Rekognition's own top-level moderation categories — matching against
// these (rather than every specific sub-label under them) keeps this
// aligned with however granular AWS's label taxonomy gets over time.
const BLOCKED_CATEGORIES = new Set(["Explicit Nudity", "Suggestive"]);
const MIN_CONFIDENCE = 80;

/**
 * Runs an image buffer through Rekognition's content moderation model.
 * Images only — Rekognition Video moderation is a job-based/async API
 * (StartContentModeration + polling), not a fit for a synchronous
 * upload-time check, so video posts aren't covered here.
 *
 * On a Rekognition/AWS error (e.g. missing IAM permission, outage) this
 * fails open — logs loudly and lets the upload proceed — so a moderation
 * outage can't take down posting entirely. Flip this if stricter
 * fail-closed behavior is wanted instead.
 */
const checkImageModeration = async (buffer) => {
  try {
    const result = await rekognition
      .detectModerationLabels({ Image: { Bytes: buffer }, MinConfidence: MIN_CONFIDENCE })
      .promise();

    const labels = result.ModerationLabels || [];
    const flagged = labels.some(
      (label) => BLOCKED_CATEGORIES.has(label.ParentName) || BLOCKED_CATEGORIES.has(label.Name)
    );

    return { flagged, labels };
  } catch (error) {
    console.error("Rekognition moderation check failed — allowing upload through:", error);
    return { flagged: false, labels: [], error: true };
  }
};

module.exports = { checkImageModeration };
