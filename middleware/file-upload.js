// Import multer for file handling
const multer = require("multer");
// Import v4 for generating unique IDs for files
const { v4: uuidv4 } = require("uuid");

// Mapping of acceptable file MIME types to file extensions
const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

// Set up multer for file upload
const fileUpload = multer({
  // Set disk storage for storing files
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Callback with null error and './uploads/images' as destination folder
      cb(null, "./uploads/images");
    },
    filename: (req, file, cb) => {
      // Get file extension from MIME type
      const ext = MIME_TYPE_MAP[file.mimetype];
      // Callback with null error and a unique ID with the appropriate file extension as filename
      cb(null, uuidv4() + "." + ext);
    },
  }),
  // Set 50 MB as limit for the size of a single field in the form data
  limits: { fieldSize: 50 * 1024 * 1024 },
  // Filter for accepting only valid MIME types
  fileFilter: (req, file, cb) => {
    // Check if the MIME type is in the MIME_TYPE_MAP
    const isValid = !!MIME_TYPE_MAP[file.mimetype];
    // Set error to null if valid, or to a new error with message "Invalid mime type!" if not valid
    let error = isValid ? null : new Error("Invalid mime type!");
    // Callback with error and isValid flag
    cb(error, isValid);
  },
});

module.exports = fileUpload;
