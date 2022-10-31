const express = require("express");
const { check } = require("express-validator");

const router = express.Router();

router.get("/profile");

router.get("/favorites");

router.post("/loginregister", [
  check("name").not().isEmpty().isLength({ min: 4 }),
  check("email").normalizeEmail().isEmail(),
  check("password").not().isEmpty().isLength({ min: 5 }),
  check("confirmPassword").not().isEmpty().isLength({ min: 5 }),
  check("image").not().isEmpty(),
]);

router.post("/loginregister");

module.exports = router;

// name: { type: String, required: true, minLength: 4 },
// email: { type: String, required: true, unique: true },
// password: { type: String, required: true, minLength: 5 },
// confirmPassword: { type: String, required: true, minLength: 5 },
// image: { type: String, required: false },
// places: [{ type: Schema.Types.ObjectId, required: true, ref: "Place" }],
// comments: [{ type: Schema.Types.ObjectId, required: true, ref: "Comment" }],
