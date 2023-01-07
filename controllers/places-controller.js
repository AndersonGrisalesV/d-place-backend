const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const getCoordinatesForAddress = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");
const Comment = require("../models/comment");

const cloudinary = require("../util/cloudinary");
const { Readable } = require("stream");

const ObjectId = require("mongodb").ObjectId;

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;

  // Finds place by Id
  let place;
  try {
    place = await Place.findById(placeId)
      .populate({
        path: "comments",
        model: Comment,
        populate: { path: "creatorId" },
      })
      .populate({
        path: "creatorId",
        model: User,
      });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find place.",
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError(
      "Could not find a place for the provided Id.",
      404
    );
    return next(error);
  }

  res.json({ place: place.toObject({ getters: true }) });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { title, description, address, postDate, creatorId, image } = req.body;

  // Creates coordinates neccesary for the geolocation used by googleMaps
  let coordinates;
  try {
    coordinates = await getCoordinatesForAddress(address);
  } catch (error) {
    return next(error);
  }

  // Saves image in cloudinary
  let result;
  let croppedImage;

  // const bufferUpload = async (buffer) => {
  //   return new Promise((resolve, reject) => {
  //     const writeStream = cloudinary.uploader.upload_stream((err, result) => {
  //       if (err) {
  //         reject(err);
  //         return;
  //       }
  //       resolve(result);
  //     });
  //     const readStream = new Readable({
  //       read() {
  //         this.push(buffer);
  //         this.push(null);
  //       },
  //     });
  //     readStream.pipe(writeStream);
  //   });
  // };

  try {
    result = await cloudinary.uploader.upload(image, {
      folder: "places",
      // width: 300,
      // crop: "scale",
    });
    // result = await bufferUpload(image);
  } catch (error) {
    return next(
      new HttpError(
        "Something went wrong when uploading the image, please try again.",
        400
      )
    );
  }

  // Defines new place's Schema
  const createdPlace = new Place({
    title,
    description,
    imageUrl: {
      public_id: result.public_id,
      url: result.secure_url,
    },
    address,
    favoritesUserIds: [],
    location: coordinates,
    postDate,
    creatorId,
    comments: [],
    shareCount: 0,
  });

  // Finds user to enable the creation of a place
  let user;
  try {
    user = await User.findById(creatorId);
  } catch (err) {
    const error = new HttpError(
      "It was not possible to create the place, please try again later.",
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError(
      "Could not find user for the provided Id.",
      404
    );
    return next(error);
  }

  // Saves new place
  try {
    createdPlace.save();
  } catch (err) {
    const error = new HttpError(
      "It was not possible to create the place, please try again later.",
      500
    );
    return next(error);
  }

  // Saves new place from user
  try {
    // const sess = await mongoose.startSession();
    // sess.startTransaction();
    // await createdPlace.save({ session: sess, validateModifiedOnly: true });

    user.places.push(createdPlace);
    await user.save();

    // await user.save({ session: sess });
    // await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "It was not possible to create the place, please try again later.",
      500
    );
    return next(error);
  }

  res.status(201).json({ place: createdPlace });
};

const updateFavorites = async (req, res, next) => {
  const placeId = req.params.pid;
  const { userId } = req.body;

  let PlaceToCheckFavoritsUserIds;
  try {
    PlaceToCheckFavoritsUserIds = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "It was not possible to fetch the user places, please try again later.",
      500
    );
    return next(error);
  }

  if (!PlaceToCheckFavoritsUserIds) {
    const error = new HttpError("Could not find this place.", 404);
    return next(error);
  }

  let isFavorite = true;

  if (PlaceToCheckFavoritsUserIds.favoritesUserIds) {
    let favoritesUser = PlaceToCheckFavoritsUserIds.favoritesUserIds.map(
      async (favorite) => {
        // console.log(id);
        console.log(favorite);
        if (favorite == userId) {
          isFavorite = false;
          console.log(userId);
          const newUid = new ObjectId(userId);
          await User.findByIdAndUpdate(newUid, {
            $pull: { favorites: placeId },
          });
          const newPid = new ObjectId(placeId);
          await Place.findByIdAndUpdate(newPid, {
            $pull: { favoritesUserIds: userId },
          });
        }
      }
    );
    if (isFavorite) {
      const newUid = new ObjectId(userId);
      await User.findByIdAndUpdate(newUid, {
        $push: { favorites: placeId },
      });
      const newPid = new ObjectId(placeId);
      await Place.findByIdAndUpdate(newPid, {
        $push: { favoritesUserIds: userId },
      });
    }
  }

  res.json({ favorite: isFavorite });
};

const updateCountShare = async (req, res, next) => {
  const placeId = req.params.pid;

  let PlaceToupdateCountShares;
  try {
    PlaceToupdateCountShares = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "It was not possible to fetch the places to update share count, please try again later.",
      500
    );
    return next(error);
  }

  if (!PlaceToupdateCountShares) {
    const error = new HttpError("Could not find this place.", 404);
    return next(error);
  }

  const { newShare } = req.body;

  let isSharedPost = true;

  PlaceToupdateCountShares.shareCount =
    PlaceToupdateCountShares.shareCount + newShare;

  // Updates place
  try {
    await PlaceToupdateCountShares.save();
  } catch (err) {
    isSharedPost = false;
    const error = new HttpError(
      "Something went wrong, could not update place's share counts.",
      500
    );
    // console.log(err);
    return next(error);
  }

  res.json({ sharePost: isSharedPost });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // console.log(errors);
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { title, description, address, postDate, image } = req.body;
  const placeId = req.params.pid;

  let coordinates;
  if (address !== "same") {
    // Updates coordinates neccesary for the geolocation used by googleMaps
    try {
      coordinates = await getCoordinatesForAddress(address);
    } catch (error) {
      return next(error);
    }
  }

  // Finds place to update
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place.",
      500
    );
    return next(error);
  }

  // Asigns new data to be updated

  if (title !== "same") {
    place.title = title;
  }
  if (description !== "same") {
    place.description = description;
  }
  if (address !== "same") {
    place.address = address;
    place.location = coordinates;
  }
  if (image !== "same") {
    const ImgId = place.imageUrl.public_id;
    if (ImgId) {
      await cloudinary.uploader.destroy(ImgId);
    }

    let newImage;
    try {
      newImage = await cloudinary.uploader.upload(image, {
        folder: "places",
      });
    } catch (error) {
      return next(
        new HttpError(
          "Something went wrong when uploading the image, please try again.",
          400
        )
      );
    }

    place.imageUrl = {
      public_id: newImage.public_id,
      url: newImage.url,
    };
  }

  place.postDate = postDate;

  // Updates place
  try {
    await place.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place.",
      500
    );
    // console.log(err);
    return next(error);
  }
  res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;
  const plcid = req.params.pid;
  // plcid Same as placeId but stored with a different name for a clearer distinction
  // when comparing with a collection's specific name in this case placeId.

  // Finds place to delete
  let place;
  try {
    place = await Place.findById(
      placeId,
      "favoritesUserIds, imageUrl"
    ).populate({
      path: "creatorId",
      model: User,
      populate: { path: "comments" },
    });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find the place to delete.",
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError("Could not find a place for this Id.", 404);
    return next(error);
  }

  // Finds users to delete reference from comments in this place
  let retreivedUsersToDelete;
  try {
    retreivedUsersToDelete = await User.find({})
      .populate({
        path: "comments",
        model: Comment,
      })
      .populate({
        path: "favorites",
        model: Place,
        populate: { path: "favoritesUserIds" },
      });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find comments' owners from place to delete.",
      500
    );
    return next(error);
  }

  // Selects user and comments from said user to remove from this specific place
  // If user owns the place it deletes this place from the user as well
  let usersToDelete = retreivedUsersToDelete.map(async (user) => {
    // console.log("user" + user);

    let favoritesFromUserToDelete = user.favorites.map(async (favorite) => {
      // console.log("fav" + favorite);
      if (user.favorites) {
        let favoritePlacesToDelete = favorite.favoritesUserIds.map(
          async (id) => {
            // console.log("fav id" + id);
            if (favorite._id == plcid) {
              await user.favorites.remove(plcid);
            }
          }
        );
      }
    });

    let commentFromUserToDelete = user.comments.map(async (comment) => {
      // console.log("fcom" + comment);
      if (comment.placeId == plcid) {
        await user.comments.remove(comment);
        await user.places.remove(placeId);
      }
    });

    // console.log("userfa" + user.favorites);

    await user.save().catch((err) => {
      const error = new HttpError(
        "Something went wrong, could not delete comments from owners of the place.",
        500
      );
      return next(error);
    });
  });

  // Finds comments from this place to delete
  let retreivedCommentsToDelete;
  try {
    retreivedCommentsToDelete = await Comment.find({ placeId: plcid }).populate(
      {
        path: "placeId",
        model: Place,
      }
    );
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find comments to delete from the place.",
      500
    );
    return next(error);
  }

  // Deletes comments from this place
  let commentsToDelete = retreivedCommentsToDelete.map(async (comment) => {
    if (comment.placeId._id == plcid) {
      // let commentFromUserToDelete = comment.placeId.comments.map(async (id) => {
      //   // await place.comments.remove(id);
      // });
      await comment.deleteOne({ _id: comment._id });
    }
  });

  // Deletes place
  // Removes reference from place stored in user's owner of the place
  try {
    //Deletes the image from cloduinary
    const ImgId = place.imageUrl.public_id;

    await cloudinary.uploader.destroy(ImgId);

    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.remove({ session: sess, validateModifiedOnly: true });
    place.creatorId.places.pull(place);
    await place.creatorId.save({ session: sess });
    await sess.commitTransaction();

    await place.deleteOne({ places: place.creatorId });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete the place.",
      500
    );
    console.log(err);
    return next(error);
  }

  res.status(200).json({ message: "The place was deleted." });
};

//////////////////// Comments Section ////////////////////

const createComment = async (req, res, next) => {
  const placeId = req.params.pid;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  // Finds place to assign comment to
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a place.",
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError(
      "Could not find a place for the provided Id.",
      404
    );
    return next(error);
  }

  const { commentText, postCommentDate, creatorId } = req.body;

  // Defines new comment's Schema
  const createdComment = new Comment({
    commentText,
    postCommentDate,
    creatorId,
    placeId: place._id,
  });

  // Finds user to assign comment to
  let user;
  try {
    user = await User.findById(creatorId);
  } catch (err) {
    const error = new HttpError(
      "It was not possible to create the comment, please try again later.",
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError(
      "Could not find a user for the provided Id.",
      404
    );
    return next(error);
  }

  // Saves new comment
  try {
    createdComment.save();
  } catch (err) {
    const error = new HttpError(
      "It was not possible to create the comment, please try again later.",
      500
    );
    return next(error);
  }

  // Saves new comment for this place
  try {
    // const sess = await mongoose.startSession();
    // sess.startTransaction();
    // await createdComment.save({ session: sess, validateModifiedOnly: true });

    place.comments.push(createdComment);
    await place.save();

    // place.comments.push(createdComment);
    // await place.save({ session: sess });
    // await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not create the comment for the place.",
      500
    );
    return next(error);
  }

  // Saves new comment from user
  try {
    // const sess = await mongoose.startSession();
    // sess.startTransaction();
    // await createdComment.save({ session: sess, validateModifiedOnly: true });

    user.comments.push(createdComment);
    await user.save();

    // user.comments.push(createdComment);
    // await user.save({ session: sess });
    // await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "It was not possible to create the comment, please try again later.",
      500
    );
    return next(error);
  }

  res.status(201).json({ comment: createdComment });
};

const updateComment = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { commentText, postCommentDate } = req.body;
  const commentId = req.params.cid;

  // Finds comment to update
  let comment;
  try {
    comment = await Comment.findById(commentId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update comment.",
      500
    );
    return next(error);
  }

  // Asigns new data to be updated
  comment.commentText = commentText;
  comment.postCommentDate = postCommentDate;

  // Updateds comment
  try {
    await comment.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update comment.",
      500
    );
    return next(error);
  }

  res.status(200).json({ comment: comment.toObject({ getters: true }) });
};

const deleteComment = async (req, res, next) => {
  const placeId = req.params.pid;
  const plcid = req.params.pid;
  // plcid Same as placeId but stored with a different name for a clearer distinction
  // when comparing with a collection's specific name in this case placeId.

  const commentId = req.params.cid;

  // Finds place to update comments in said place
  let place;
  try {
    place = await Place.findById(placeId).populate({
      path: "creatorId",
      model: User,
    });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find place to delete comment.",
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError("Could not find a place for this Id.", 404);
    return next(error);
  }

  // Finds comment to delete said comment
  let comment;
  try {
    comment = await Comment.findById(commentId).populate({
      path: "placeId",
      model: Place,
    });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete comment.",
      500
    );
    return next(error);
  }

  if (!comment) {
    const error = new HttpError("Could not find a comment for this Id.", 404);
    return next(error);
  }

  // Finds user to delete reference from comment
  let commentUser;
  try {
    commentUser = await User.findById(comment.creatorId).populate({
      path: "comments",
      model: Comment,
    });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find owner of the comment.",
      500
    );
    return next(error);
  }

  if (!commentUser) {
    const error = new HttpError("Could not find a comment for this Id.", 404);
    return next(error);
  }

  // Checks if comment belongs to the place in which we want to delete said comment and removes it from the place
  if (comment.placeId._id == plcid) {
    let updatePlaceComments = comment.placeId.comments.map(async (id) => {
      if (id == commentId) {
        await place.comments.remove(id);
        return;
      }
    });

    // checks if comment belongs to user and removes said comment from user
    let updateUserComments = commentUser.comments.map(async (id) => {
      if (id._id == commentId) {
        await commentUser.comments.remove(id);
        return;
      }
    });

    // Updates user's comments
    try {
      await commentUser.save();
    } catch (err) {
      const error = new HttpError(
        "Something went wrong, could not delete comment.",
        500
      );
      return next(error);
    }

    // Updates place's comments and delete comment
    try {
      await comment.deleteOne({ _id: commentId });
      await place.save();
    } catch (err) {
      const error = new HttpError(
        "Something went wrong, could not delete comment.",
        500
      );
      return next(error);
    }
  }

  res.status(200).json({ message: "The comment was deleted." });
};

exports.getPlaceById = getPlaceById;
exports.createPlace = createPlace;
exports.updateFavorites = updateFavorites;
exports.updateCountShare = updateCountShare;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;

exports.createComment = createComment;
exports.updateComment = updateComment;
exports.deleteComment = deleteComment;
