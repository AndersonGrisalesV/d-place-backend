const express = require("express");
const { check } = require("express-validator");

const router = express.Router();

router.get("/:placeId");

router.post("/newPlace", [
  check("title").not().isEmpty().isLength({ max: 67 }),
  check("description").not().isEmpty().isLength({ max: 377 }),
  check("imageUrl").not().isEmpty(),
  check("address").not().isEmpty().isLength({ max: 99 }),
  check("favorite").not().isEmpty().isBoolean(),
]);

router.patch("/editPlace/:placeId", [
  check("title").not().isEmpty().isLength({ max: 67 }),
  check("description").not().isEmpty().isLength({ max: 377 }),
  check("imageUrl").not().isEmpty(),
  check("address").not().isEmpty().isLength({ max: 99 }),
  check("favorite").not().isEmpty().isBoolean(),
]);

router.delete("/deletePlace/:placeId");

router.post("/newComment/:placeId", [
  check("postCommentDate").isISO8601().toDate(), //maybe requirees a specific format
  check("commentText").not().isEmpty().isLength({ max: 377 }),
]);

router.patch("/editComment/:placeId:/:commentId", [
  check("postCommentDate").isISO8601().toDate(), //maybe requirees a specific format
  check("commentText").not().isEmpty().isLength({ max: 377 }),
]);

router.delete("/deleteComment/:placeId/:commentId");

module.exports = router;

// postCommentDate: { type: Date, required: true },
// commentText: { type: String, maxLength: 377 },
// placeId: { type: Schema.Types.ObjectId, required: true, ref: "Place" },

// creatorId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
