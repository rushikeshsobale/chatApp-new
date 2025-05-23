const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");
const Media = require("../Modules/Media.js");
require("dotenv").config();

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Helper function to generate hash for file
const generateFileHash = (buffer) => {
  return crypto.createHash("sha256").update(buffer).digest("hex");
};
// Helper function to check for duplicate media
const checkDuplicateMedia = async (hash) => {
  return await Media.findOne({ hash });
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
          url: existingMedia.url,
          hash,
          isDuplicate: true
        };
      }
    }

    // Generate unique filename using hash and original filename
    const encodedFileName = encodeURIComponent(file.originalname);
    const uniqueFileName = generateUniqueName 
      ? `${hash.substring(0, 16)}-${encodedFileName}`
      : encodedFileName;

    // Set up S3 upload parameters
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `${folder}/${uniqueFileName}`,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: "public-read"
    };

    // Upload to S3
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    
    // Generate media URL
    const mediaUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
    console.log(params.Key, command, 'command') 
    // Save to Media collection if checking duplicates
    if (checkDuplicate) {
      await Media.create({ hash, url: mediaUrl });
    }

    return {
      url: mediaUrl,
      hash,
      isDuplicate: false
    };
  } catch (error) {
    console.error("Error in S3 upload:", error);
    throw new Error("Failed to upload file to S3");
  }
};

// Delete file from S3
const deleteFromS3 = async (fileUrl) => {
  try {
    const key = fileUrl.split('.com/')[1];
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
  s3Client
}; 