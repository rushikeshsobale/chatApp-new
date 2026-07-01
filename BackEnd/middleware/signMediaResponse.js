const { signDeep } = require("../utils/s3Upload");

// Wraps res.json so every response payload has its stored media
// keys/legacy urls (profilePicture, media, groupAvatar, mediaUrl,
// attachment.url) turned into fresh pre-signed S3 urls before it's sent.
// Centralizing this here means individual route handlers don't each need
// to remember to sign the fields they return.
const signMediaResponse = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    signDeep(body)
      .then((signed) => originalJson(signed))
      .catch((error) => {
        console.error("Failed to sign media urls in response:", error);
        originalJson(body);
      });
    return res;
  };

  next();
};

module.exports = signMediaResponse;
