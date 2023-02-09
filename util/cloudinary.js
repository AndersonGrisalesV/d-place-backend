const cloudinary = require("cloudinary").v2;

// Configure the cloudinary settings using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_KEY,
  api_secret: process.env.CLOUD_KEY_SECRET,
  secure: true,
});

module.exports = cloudinary;
