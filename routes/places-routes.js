const express = require("express");
const { check } = require("express-validator");

const placesController = require("../controllers/places-controller");

const router = express.Router();

router.get("/:pid", placesController.getPlaceById);

router.post(
  "/newplace",
  [
    check("title").not().isEmpty().isLength({ max: 67 }),
    check("description").not().isEmpty().isLength({ max: 377 }),
    // check("imageUrl").not().isEmpty(),
    check("address").not().isEmpty().isLength({ max: 99 }),
    check("favorite").not().isEmpty().isBoolean(),
    check("postDate"),
  ],
  placesController.createPlace
);

router.patch(
  "/editplace/:pid",
  [
    check("title").not().isEmpty().isLength({ max: 67 }),
    check("description").not().isEmpty().isLength({ max: 377 }),
    // check("imageUrl").not().isEmpty(),
    check("address").not().isEmpty().isLength({ max: 99 }),
    // check("favorite").not().isEmpty().isBoolean(),
    // check("postDate").isISO8601().toDate(),
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

router.patch("/editcomment/:placeId:/:commentId", [
  // check("postCommentDate").isISO8601().toDate(), //maybe requirees a specific format
  check("commentText").not().isEmpty().isLength({ max: 377 }),
]);

router.delete("/:pid/deletecomment/:cid", placesController.deleteComment);

module.exports = router;

// postCommentDate: { type: Date, required: true },
// commentText: { type: String, maxLength: 377 },
// placeId: { type: Schema.Types.ObjectId, required: true, ref: "Place" },

// creatorId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
