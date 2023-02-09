const express = require("express");
// Import the express-validator library for validating incoming requests
const { check } = require("express-validator");

// Import the placesController
const placesController = require("../controllers/places-controller");

// Import the file-upload middleware for handling file uploads
const fileUpload = require("../middleware/file-upload");

// Create an instance of the express router
const router = express.Router();

// Import the check-auth middleware for handling authentication
const checkAuth = require("../middleware/check-auth");

// Define GET route to get a place by ID
router.get("/:pid", placesController.getPlaceById);

// Define PATCH route to share a place
router.patch("/shareplace/:pid", placesController.updateCountShare);

//* Middleware to check authentication (Affects all routes bellow it)
router.use(checkAuth);

// DefinePOST route to create a new place
// Use the fileUpload middleware to process the uploaded image
// Validation checks for the required fields
router.post(
  "/newplace",
  fileUpload.single("image"),
  [
    check("title").not().isEmpty().isLength({ max: 67 }),
    check("description").not().isEmpty().isLength({ max: 377 }),
    check("address").not().isEmpty().isLength({ max: 99 }),
    check("postDate").isISO8601().toDate(),
  ],
  placesController.createPlace
);

// Define PATCH route to update the favorite status of a place
router.patch("/favoriteplace/:pid", placesController.updateFavorites);

// Define PATCH route to update a place
// Use the fileUpload middleware to process the uploaded image
// Validation checks for the required fields
router.patch(
  "/editplace/:pid",
  fileUpload.single("image"),
  [
    check("title").not().isEmpty().isLength({ max: 67 }),
    check("description").not().isEmpty().isLength({ max: 377 }),
    check("address").not().isEmpty().isLength({ max: 99 }),
    check("postDate").isISO8601().toDate(),
  ],
  placesController.updatePlace
);

// Define DELETE route to delete a place
router.delete("/deleteplace/:pid", placesController.deletePlace);

//* Comment routes /////////////////////////

// Define POST route to create a new comment for a place
// Validation checks for the required fields
router.post(
  "/:pid/newcomment",
  [check("commentText").not().isEmpty().isLength({ max: 377 })],
  placesController.createComment
);

// Define PATCH route to update a comment
// Validation checks for the required fields
router.patch(
  "/:pid/editcomment/:cid",
  [check("commentText").not().isEmpty().isLength({ max: 377 })],
  placesController.updateComment
);

// Define DELETE route to delete a comment
router.delete("/:pid/deletecomment/:cid", placesController.deleteComment);

module.exports = router;
