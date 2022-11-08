const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const getCoordinatesForAddress = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");
const Comment = require("../models/comment");
const comment = require("../models/comment");

const getPlaceById = async (req, res, next) => {
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

  let coordinates;
  try {
    coordinates = await getCoordinatesForAddress(address);
  } catch (error) {
    return next(error);
  }

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

  let user;
  try {
    user = await User.findById(creatorId);
  } catch (err) {
    const error = new HttpError(
      "Creating place failed, please try again.",
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

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess, validateModifiedOnly: true });
    user.places.push(createdPlace);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Creating place failed, please try again.",
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
      new HttpError("Invalid inputs passed, please chech your data.", 422)
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
    console.log("place" + place);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete place.",
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

  let commentUserToDelete = [];

  commentUserToDelete = placeComments.comments.map(
    (creator) => creator.creatorId
  );

  console.log("comments loaded" + commentsloaded);

  let retreivedCommentsToDelete;
  try {
    retreivedCommentsToDelete = await Comment.find({ placeId: plcid }).populate(
      {
        path: "placeId",
        // match: { placeId: plcid },
        model: Place,
      }
    );
    console.log("retreivedCommentsToDelete" + retreivedCommentsToDelete);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete place3.",
      500
    );
    return next(error);
  }

  let retreivedUsersToDelete;
  try {
    retreivedUsersToDelete = await User.find({}, "comments").populate({
      path: "comments",
      // match: { "places.placeId": plcid },
      model: Comment,
    });
    // retreivedUsersToDelete = [...retreivedUsersToDelete];
    console.log("retreivedUsersToDelete" + retreivedUsersToDelete);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete place4.",
      500
    );
    return next(error);
  }

  let Users = retreivedUsersToDelete.map(async (user) => {
    let usersComment = user.comments.map(async (comment) => {
      if (comment.placeId == plcid) {
        console.log("user" + user);
        console.log("aqui" + comment);
        await user.comments.remove(comment);
      }
    });
    await user.save();
  });

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await comment.deleteMany({ session: sess, validateModifiedOnly: true });
    // comment.creatorId.comments.pull(comment);

    await retreivedCommentsToDelete
      .deleteMany({ comments: { $in: [...commentsloaded] } })
      .session(session);
    await comment.save({ session: sess });

    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete place.",
      500
    );
    return next(error);
  }

  // try {
  //   const sess = await mongoose.startSession();
  //   sess.startTransaction();
  //   // await place.remove({ session: sess, validateModifiedOnly: true });
  //   retreivedCommentsToDelete.forEach(async (comment) => {
  //     await comment.placeId.comments.remove({
  //       session: sess,
  //       validateModifiedOnly: true,
  //     });
  //     console.log(comment);
  //   });
  //   // comment.placeId.places.pull(comment);
  //   // await comment.placeId.save({ session: sess });
  //   await sess.commitTransaction();
  // } catch (err) {
  //   const error = new HttpError(
  //     "Something went wrong, could not delete commento.",
  //     500
  //   );
  //   return next(error);
  // }

  // try {
  //   const sess = await mongoose.startSession();
  //   sess.startTransaction();
  //   await place.remove({ session: sess, validateModifiedOnly: true });
  //   place.creatorId.places.pull(place);
  //   // place.comments.creatorId.places.pull(place);
  //   // place.comments.placeId.pull(place);
  //   // place.comments.creatorId.pull(place);
  //   await place.creatorId.save({ session: sess });
  //   // await place.comments.placeId.save({ session: sess });
  //   await sess.commitTransaction();
  // } catch (err) {
  //   const error = new HttpError(
  //     "Something went wrong, could not delete place.",
  //     500
  //   );
  //   return next(error);
  // }

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
      "Creating comment failed, please try again.",
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
      "Creating comment failed, please try again.",
      500
    );
    return next(error);
  }

  res.status(201).json({ comment: createdComment });
};

const deleteComment = async (req, res, next) => {
  const placeId = req.params.pid;
  const commentId = req.params.cid;

  // let placeComment;

  // try {
  //   placeComment = await Place.findById(placeId).populate({
  //     path: "comments",
  //     match: { _id: commentId },
  //     model: Comment,
  //   });
  //   console.log("deletecomment" + placeComment);
  // } catch (err) {
  //   const error = new HttpError(
  //     "Something went wrong, could not delete place2.",
  //     500
  //   );
  //   return next(error);
  // }

  // if (!placeComment) {
  //   const error = new HttpError("Could not find a comment for this id.", 404);
  //   return next(error);
  // }

  let comment;

  try {
    comment = await Comment.findById(commentId).populate({
      path: "placeId",
      model: Place,
    });
    console.log("deletecomment" + comment);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete comment.",
      500
    );
    return next(error);
  }

  if (!comment) {
    const error = new HttpError("Could not find a comment for this id.", 404);
    return next(error);
  }

  let commentUser;

  try {
    commentUser = await Comment.findById(commentId).populate({
      path: "creatorId",
      model: User,
    });
    console.log("deletecomment" + commentUser);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete comment.",
      500
    );
    return next(error);
  }

  if (!commentUser) {
    const error = new HttpError("Could not find a comment for this id.", 404);
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await comment.remove({ session: sess, validateModifiedOnly: true });

    comment.placeId.comments.pull(comment); //removes automatically id
    // comment.creatorId.comments.pull(comment); //removes automatically id

    await comment.placeId.save({ session: sess });
    // comment.creatorId.comments.pull(comment); //removes automatically id

    // await comment.creatorId.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete comment.",
      500
    );
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await commentUser.remove({ session: sess, validateModifiedOnly: true });
    commentUser.creatorId.comments.pull(commentUser); //removes automatically id
    commentUser.creatorId.comments.pull(commentUser); //removes automatically id
    await commentUser.creatorId.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete comment.",
      500
    );
    return next(error);
  }

  res.status(200).json({ message: "Comment was deleted." });
};

exports.getPlaceById = getPlaceById;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;

exports.createComment = createComment;
exports.deleteComment = deleteComment;

// title: { type: String, required: true, maxLength: 67 },
// description: { type: String, required: true, maxLength: 377 },
// imageUrl: { type: String, required: true },
// address: { type: String, required: true, maxLength: 99 },
// favorite: { type: Boolean, required: true },
// location: {
//   lat: { type: Number, required: true },
//   lng: { type: Number, required: true },
// },
// postDate: { type: Date, required: true },
// creatorId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
// comments: [{ type: Schema.Types.ObjectId, required: true, ref: "Comment" }],
