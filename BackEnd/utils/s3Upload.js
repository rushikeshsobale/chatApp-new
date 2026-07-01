const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");
const Media = require("../Modules/Media.js");
require("dotenv").config();
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const { promisify } = require('util');
const fs = require('fs');
const os = require('os');
// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Default lifetime for a pre-signed GET url
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

// Helper function to generate hash for file
const generateFileHash = (buffer) => {
  return crypto.createHash("sha256").update(buffer).digest("hex");
};
// Helper function to check for duplicate media
const checkDuplicateMedia = async (hash) => {
  return await Media.findOne({ hash });
};

// Records stored before this migration hold a full public S3 URL
// (https://bucket.s3.region.amazonaws.com/key). New records store only the
// bare object key. This normalizes either shape down to a bare key so both
// old and new records can be turned into a pre-signed url the same way.
// Returns null for anything that isn't one of our own S3 objects (e.g. the
// default Gravatar avatar url) so callers can tell "not ours" apart from
// "malformed".
const resolveMediaKey = (stored) => {
  if (!stored || typeof stored !== "string") return null;
  if (stored.startsWith("http://") || stored.startsWith("https://")) {
    const bucketHost = process.env.S3_BUCKET_NAME && process.env.AWS_REGION
      ? `${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`
      : null;
    if (!bucketHost || !stored.includes(bucketHost)) return null;
    return stored.split(bucketHost)[1] || null;
  }
  return stored;
};

// Generate a time-limited GET url for a private S3 object.
const getSignedMediaUrl = async (key, expiresIn = SIGNED_URL_TTL_SECONDS) => {
  if (!key) return null;
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
    });
    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error("Error generating signed media url:", error);
    return null;
  }
};

// Accepts either a bare key (new records) or a legacy full url (old
// records) and returns a fresh signed url. Values that aren't one of our
// own S3 objects (e.g. the default Gravatar avatar url) are passed through
// unchanged rather than signed.
const signMediaValue = async (stored) => {
  if (!stored || typeof stored !== "string") return null;
  const key = resolveMediaKey(stored);
  if (!key) {
    if (stored.startsWith("http://") || stored.startsWith("https://")) return stored;
    return null;
  }
  return getSignedMediaUrl(key);
};

// Field names that are known to hold a stored media key/legacy url.
// "attachment" is handled specially below since it's an object whose
// nested `.url` needs signing, not the object itself.
const SIGNABLE_FIELDS = new Set(["profilePicture", "media", "groupAvatar", "mediaUrl"]);

// Recursively walks a response payload (plain objects/arrays, or Mongoose
// documents) and replaces every known media field's stored key/legacy url
// with a fresh pre-signed url. Used by the signMediaResponse middleware so
// individual route handlers don't each need to remember to do this.
const signDeep = async (value) => {
  if (value === null || value === undefined) return value;

  // Leave BSON types (ObjectId, Decimal128, ...) and buffers alone —
  // recursing into them as plain objects would corrupt their internal
  // representation instead of treating them as opaque leaf values.
  if (value._bsontype || Buffer.isBuffer(value)) return value;

  // Mongoose documents (and lean results with a toObject helper attached)
  if (typeof value.toObject === "function") {
    value = value.toObject();
  }

  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => signDeep(item)));
  }

  if (value instanceof Date) return value;

  if (typeof value === "object") {
    const entries = await Promise.all(
      Object.entries(value).map(async ([k, v]) => {
        if (k === "attachment" && v && typeof v === "object") {
          return [k, { ...v, url: await signMediaValue(v.url) }];
        }
        if (SIGNABLE_FIELDS.has(k) && typeof v === "string") {
          return [k, await signMediaValue(v)];
        }
        if (v && typeof v === "object") {
          return [k, await signDeep(v)];
        }
        return [k, v];
      })
    );
    return Object.fromEntries(entries);
  }

  return value;
};
// Main upload function
const uploadToS3 = async (file, options = {}) => {
  try {
    const {
      folder = "uploads",
      checkDuplicate = true,
      generateUniqueName = true
    } = options;
    // Generate hash for duplicate checking
    const hash = generateFileHash(file.buffer);
    // Check for duplicates if needed
    if (checkDuplicate) {
      const existingMedia = await checkDuplicateMedia(hash);
      if (existingMedia) {
        console.log("Duplicate image found, reusing existing S3 file");
        return {
          key: resolveMediaKey(existingMedia.url),
          hash,
          isDuplicate: true
        };
      }
    }

    // Generate unique filename using hash and original filename
    const encodedFileName = encodeURIComponent(file.originalname);
    const uniqueFileName = generateUniqueName
      ? `${hash.substring(0, 16)}`
      : encodedFileName;

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `${folder}/${uniqueFileName}`,
      Body: file.buffer,
      ContentType: file.mimetype,

    };

    // Upload to S3
    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    // Store the bare object key. Historically this stored a full public
    // URL (bucket is now expected to be private and served via pre-signed
    // urls) — the `url` field name is kept on the Media model to avoid an
    // unrelated schema migration, but the value is now always a bare key.
    if (checkDuplicate) {
      await Media.create({ hash, url: params.Key });
    }

    return {
      key: params.Key,
      hash,
      isDuplicate: false
    };
  } catch (error) {
    console.error("Error in S3 upload:", error);
    throw new Error("Failed to upload file to S3");
  }
};

// Delete file from S3. Accepts either a bare key (new records) or a
// legacy full url (old records) so callers don't need to know which shape
// a given record is in.
const deleteFromS3 = async (fileUrlOrKey) => {
  try {
    const key = resolveMediaKey(fileUrlOrKey);
    if (!key) return false;

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key
    };

    const command = new DeleteObjectCommand(params);
    await s3Client.send(command);

    return true;
  } catch (error) {
    console.error("Error deleting from S3:", error);
    throw new Error("Failed to delete file from S3");
  }
};

module.exports = {
  uploadToS3,
  deleteFromS3,
  resolveMediaKey,
  getSignedMediaUrl,
  signMediaValue,
  signDeep,
  s3Client
};

const compressVideo = async (inputBuffer) => {
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `input-${Date.now()}.mp4`);
  const outputPath = path.join(tempDir, `output-${Date.now()}.mp4`);
  // Write input buffer to temp file
  await fs.promises.writeFile(inputPath, inputBuffer);
  return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
          .outputOptions([
              '-c:v libx264', // Use H.264 codec
              '-crf 28', // Constant Rate Factor (lower = better quality, 28 is a good balance)
              '-preset medium', // Encoding preset
              '-c:a aac', // Audio codec
              '-b:a 128k', // Audio bitrate
              '-vf scale=1080:1920:force_original_aspect_ratio=decrease', // Resize to story dimensions
              '-pix_fmt yuv420p' // Pixel format for better compatibility
          ])
          .output(outputPath)
          .on('end', async () => {
              try {
                  const compressedBuffer = await fs.promises.readFile(outputPath);
                  // Clean up temp files
                  await fs.promises.unlink(inputPath);
                  await fs.promises.unlink(outputPath);
                  resolve(compressedBuffer);
              } catch (error) {
                  reject(error);
              }
          })
          .on('error', (err) => {
              // Clean up temp files
              fs.unlink(inputPath, () => {});
              fs.unlink(outputPath, () => {});
              reject(err);
          })
          .run();
  });
};

// Middleware to compress media before upload
const compressMedia = async (req, res, next) => {
  if (!req.file) return next();
  
  try {
      if (req.file.mimetype.startsWith('image/')) {
          const compressedBuffer = await sharp(req.file.buffer)
              .resize(1080, 1920, {
                  fit: 'inside',
                  withoutEnlargement: true
              })
              .jpeg({ quality: 80 })
              .toBuffer();
          
          req.file.buffer = compressedBuffer;
          req.file.size = compressedBuffer.length;
      } else if (req.file.mimetype.startsWith('video/')) {
          const compressedBuffer = await compressVideo(req.file.buffer);
          req.file.buffer = compressedBuffer;
          req.file.size = compressedBuffer.length;
      }
  } catch (error) {
      console.error('Error compressing media:', error);
  }
  next();
};