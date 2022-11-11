const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const getCoordinatesForAddress = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");
const Comment = require("../models/comment");

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;

  // Finds place by Id
  let place;
  try {
    place = await Place.findById(placeId);
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

  const { title, description, address, favorite, postDate, creatorId } =
    req.body;

  // Creates coordinates neccesary for geolocation used by googleMaps
  let coordinates;
  try {
    coordinates = await getCoordinatesForAddress(address);
  } catch (error) {
    return next(error);
  }

  // Defines new place's Schema
  const createdPlace = new Place({
    title,
    description,
    imageUrl:
      "https://www.esbnyc.com/sites/default/files/2020-01/thumbnail5M2VW4ZF.jpg",
    address,
    favorite,
    location: coordinates,
    postDate,
    creatorId,
    comments: [],
  });

  // Finds user to enable the creation of a place
  let user;
  try {
    user = await User.findById(creatorId);
  } catch (err) {
    const error = new HttpError(
      "Creating place failed, please try again later.",
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

  // Saves place
  try {
    createdPlace.save();
  } catch (err) {
    const error = new HttpError(
      "It was not possible to create the place, please try again later.",
      500
    );
    return next(error);
  }

  // Saves user's place
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

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { title, description, address, postDate } = req.body;
  const placeId = req.params.pid;

  let coordinates;
  try {
    coordinates = await getCoordinatesForAddress(address);
  } catch (error) {
    return next(error);
  }

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

  place.title = title;
  place.description = description;
  place.address = address;
  place.location = coordinates;
  place.postDate = postDate;

  try {
    await place.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place.",
      500
    );
    return next(error);
  }
  res.status(200).json({ place: place.toObject({ getters: true }) });
};

// 3 ids to delete
// 1 placeid
// 2 creatorid
// the id of the comment
const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;
  const plcid = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId).populate({
      path: "creatorId",
      model: User,
    });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find place to delete.",
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError("Could not find a place for this id.", 404);
    return next(error);
  }

  let placeComments;
  try {
    placeComments = await Place.findById(placeId).populate({
      path: "comments",
      model: Comment,
    });
    console.log("here" + placeComments.comments);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete place2.",
      500
    );
    return next(error);
  }

  let commentsloaded = [];

  commentsloaded = placeComments.comments.map((comment) => comment._id);

  let retreivedUsersToDelete;
  try {
    retreivedUsersToDelete = await User.find({}).populate({
      path: "comments",
      model: Comment,
    });
    console.log("retreivedUsersToDelete" + retreivedUsersToDelete);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find users to delete comments from deleted place.",
      500
    );
    return next(error);
  }

  let usersToDelete = retreivedUsersToDelete.map(async (user) => {
    let commentFromUserToDelete = user.comments.map(async (comment) => {
      if (comment.placeId == plcid) {
        console.log("user" + user);
        console.log("aqui" + comment);
        await user.comments.remove(comment);
        await user.places.remove(placeId);
      }
    });
    await user.save();
  });

  let retreivedCommentsToDelete;
  try {
    retreivedCommentsToDelete = await Comment.find({ placeId: plcid }).populate(
      {
        path: "placeId",
        model: Place,
      }
    );
    console.log("retreivedCommentsToDelete" + retreivedCommentsToDelete);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find comments to delete from place.",
      500
    );
    return next(error);
  }

  let commentsToDelete = retreivedCommentsToDelete.map(async (comment) => {
    if (comment.placeId._id == plcid) {
      let commentFromUserToDelete = comment.placeId.comments.map(async (id) => {
        await place.comments.remove(id);

        console.log("fdfffffffff" + id);
      });
      console.log("asdasd" + comment);
      await comment.deleteOne({ _id: comment._id });
    }
  });
  await place.save();

  // let commentUserToDelete = [];

  // commentUserToDelete = placeComments.comments.map(
  //   (creator) => creator.creatorId
  // );

  // console.log("comments loaded" + commentsloaded);

  // try {
  //   commentsToDelete
  // } catch (err) {
  //   const error = new HttpError(
  //     "Something went wrong, could not delete comments from place.",
  //     500
  //   );
  //   return next(error);
  // }

  try {
    console.log("news" + place);
    console.log("news" + place.creatorId);
    await place.deleteOne({ places: place.creatorId });
    // await place.save();

    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.remove({ session: sess, validateModifiedOnly: true });
    place.creatorId.places.pull(place);
    await place.creatorId.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete place.",
      500
    );
    console.log(err);
    return next(error);
  }

  res.status(200).json({ message: "Place was deleted." });
};

// Comments Section

const createComment = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const placeId = req.params.pid;

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
      "Could not find a place for the provided id.",
      404
    );
    return next(error);
  }

  const { commentText, postCommentDate, creatorId } = req.body;

  const createdComment = new Comment({
    commentText,
    postCommentDate,
    creatorId,
    placeId: place._id,
  });

  console.log(createdComment);

  let user;
  try {
    user = await User.findById(creatorId);
  } catch (err) {
    const error = new HttpError(
      "Creating comment failed, please try again later.",
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

  // const sess = await mongoose.startSession();
  // sess.startTransaction();
  // await createdComment.save({ session: sess, validateModifiedOnly: true });
  // user.comments.push(createdComment);

  // await user.save({ session: sess });
  // await sess.commitTransaction();

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdComment.save({ session: sess, validateModifiedOnly: true });
    place.comments.push(createdComment);

    await place.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place.",
      500
    );
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdComment.save({ session: sess, validateModifiedOnly: true });
    user.comments.push(createdComment);

    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Creating comment failed, please try again later.",
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
  // Same as placeId but sotered with a different name for a clear distinction
  //when comparing with a collection's specific name in this case placeId as well.
  const plcid = req.params.pid;
  const commentId = req.params.cid;

  // Retrieves place to update comments in said place
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

  // Retrieves comments to delete said comment
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

  // Retrieves user to delete reference from comment in User
  let commentUser;
  try {
    commentUser = await User.findById(comment.creatorId).populate({
      path: "comments",
      model: Comment,
    });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete comment.",
      500
    );
    return next(error);
  }

  if (!commentUser) {
    const error = new HttpError("Could not find a comment for this Id.", 404);
    return next(error);
  }

  // Checks if comment belongs to the place in which we want to delete said comment
  if (comment.placeId._id == plcid) {
    let updatePlaceComments = comment.placeId.comments.map(async (id) => {
      if (id == commentId) {
        await place.comments.remove(id);
        return;
      }
    });

    let updateUserComments = commentUser.comments.map(async (id) => {
      console.log(id);
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

  res.status(200).json({ message: "Comment was deleted." });
};

exports.getPlaceById = getPlaceById;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;

exports.createComment = createComment;
exports.updateComment = updateComment;
exports.deleteComment = deleteComment;
