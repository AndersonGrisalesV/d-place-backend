const express = require("express");
const { check } = require("express-validator");

const usersController = require("../controllers/users-controller");

const fileUpload = require("../middleware/file-upload");

const router = express.Router();

router.get("/", usersController.getAllUsers);

router.get("/profile/:uid", usersController.getUserById);

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

router.delete("/profile/deleteprofile/:uid", usersController.deleteProfile);

// router.get("/profile/:uid", usersController.getPlacesByUserId);

router.get("/myplaces/:uid", usersController.getPlacesByUserId);

router.get("/favorites/:uid", usersController.getFavoritePlacesByUserId);

router.post(
  "/register",
  fileUpload.single("image"),
  [
    check("name").not().isEmpty().isLength({ min: 4 }),
    check("email").normalizeEmail().isEmail(),
    check("password").not().isEmpty().isLength({ min: 5 }),
    check("confirmPassword").not().isEmpty().isLength({ min: 5 }),
    // check("image").not().isEmpty(),
  ],
  usersController.signup
);

router.post("/login", usersController.login);

module.exports = router;

// name: { type: String, required: true, minLength: 4 },
// email: { type: String, required: true, unique: true },
// password: { type: String, required: true, minLength: 5 },
// confirmPassword: { type: String, required: true, minLength: 5 },
// image: { type: String, required: false },
// places: [{ type: Schema.Types.ObjectId, required: true, ref: "Place" }],
// comments: [{ type: Schema.Types.ObjectId, required: true, ref: "Comment" }],
