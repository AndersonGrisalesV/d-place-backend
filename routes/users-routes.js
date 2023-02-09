const express = require("express");
// Import the express-validator library for validating incoming requests
const { check } = require("express-validator");

// Import the usersController
const usersController = require("../controllers/users-controller");

// Import the file-upload middleware for handling file uploads
const fileUpload = require("../middleware/file-upload");

// Create an instance of the express router
const router = express.Router();

// Import the check-auth middleware for handling authentication
const checkAuth = require("../middleware/check-auth");

// Define route to get all users
router.get("/", usersController.getAllUsers);

// Define route to register a user
// Use the fileUpload middleware to process the uploaded image
// Use the express-validator checks to validate the incoming data
router.post(
  "/register",
  fileUpload.single("image"),
  [
    check("name").not().isEmpty().isLength({ min: 4 }),
    check("email").normalizeEmail().isEmail(),
    check("theme").not().isEmpty(),
    check("notification").not().isEmpty(),
    check("password").not().isEmpty().isLength({ min: 5 }),
    check("confirmPassword").not().isEmpty().isLength({ min: 5 }),
  ],
  usersController.signup
);

// Define route to login a user
router.post("/login", usersController.login);

// Define route to update the theme preference of a user
router.patch("/updatetheme/:uid", usersController.updateModePreference);

//* Middleware to check authentication (Affects all routes bellow it)
router.use(checkAuth);

// Define route to get a user by id
router.get("/profile/:uid", usersController.getUserById);

// Define route to edit a user's profile
// Use the fileUpload middleware to process the uploaded image
// Use the express-validator checks to validate the incoming data
router.patch(
  "/profile/editprofile/:uid",
  fileUpload.single("image"),
  [
    check("name").not().isEmpty().isLength({ min: 4 }),
    check("email").normalizeEmail().isEmail(),
    check("password").not().isEmpty().isLength({ min: 5 }),
    check("confirmPassword").not().isEmpty().isLength({ min: 5 }),
  ],
  usersController.updateProfile
);

// Define route to delete a user's profile
router.delete("/profile/deleteprofile/:uid", usersController.deleteProfile);

// Define route to get the places of a user by id
router.get("/myplaces/:uid", usersController.getPlacesByUserId);

// Define route to get the favorite places of a user by id
router.get("/favorites/:uid", usersController.getFavoritePlacesByUserId);

// Define route to update the notification preference of a user
router.patch("/notification/:uid", usersController.updateNotification);

// Define route to update a user's notification settings
router.patch("/updateusernotification", usersController.updateUserNotification);

module.exports = router;
