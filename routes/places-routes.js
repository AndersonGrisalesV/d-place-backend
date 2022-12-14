const express = require("express");
const { check } = require("express-validator");

const placesController = require("../controllers/places-controller");
const fileUpload = require("../middleware/file-upload");

const router = express.Router();

router.get("/:pid", placesController.getPlaceById);

router.post(
  "/newplace",
  fileUpload.single("image"),
  [
    check("title").not().isEmpty().isLength({ max: 67 }),
    check("description").not().isEmpty().isLength({ max: 377 }),
    // check("imageUrl").not().isEmpty(),
    check("address").not().isEmpty().isLength({ max: 99 }),
    // check("favorite").not().isEmpty().isBoolean(),
    check("postDate").isISO8601().toDate(),
  ],
  placesController.createPlace
);

router.patch("/favoriteplace/:pid", placesController.updateFavorites);

router.patch("/shareplace/:pid", placesController.updateCountShare);

router.patch(
  "/editplace/:pid",
  fileUpload.single("image"),
  [
    check("title").not().isEmpty().isLength({ max: 67 }),
    check("description").not().isEmpty().isLength({ max: 377 }),
    // check("imageUrl").not().isEmpty(),
    check("address").not().isEmpty().isLength({ max: 99 }),
    // check("favorite").not().isEmpty().isBoolean(),
    check("postDate").isISO8601().toDate(),
  ],
  placesController.updatePlace
);

router.delete("/deleteplace/:pid", placesController.deletePlace);

router.post(
  "/:pid/newcomment",
  [
    //check("postCommentDate").isISO8601().toDate(), //maybe requirees a specific format
    check("commentText").not().isEmpty().isLength({ max: 377 }),
  ],
  placesController.createComment
);

router.patch(
  "/:pid/editcomment/:cid",
  [
    // check("postCommentDate").isISO8601().toDate(), //maybe requirees a specific format
    check("commentText").not().isEmpty().isLength({ max: 377 }),
  ],
  placesController.updateComment
);

router.delete("/:pid/deletecomment/:cid", placesController.deleteComment);

module.exports = router;

// postCommentDate: { type: Date, required: true },
// commentText: { type: String, maxLength: 377 },
// placeId: { type: Schema.Types.ObjectId, required: true, ref: "Place" },

// creatorId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
