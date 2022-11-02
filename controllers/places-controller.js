const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const getCoordinatesForAddress = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");
const Comment = require("../models/comment");

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
  console.log(place);
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

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId).populate({
      path: "creatorId comments",
      options: { _recursed: true },
      model: User,
      Comment,
    });
    console.log(place);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete place.",
      500
    );
    return next(error);
  }

  // try {
  //   place = await Place.findById(placeId).populate({
  //     path: "creatorId",
  //     model: User,
  //   });
  //   console.log(place);
  // } catch (err) {
  //   const error = new HttpError(
  //     "Something went wrong, could not delete place.",
  //     500
  //   );
  //   return next(error);
  // }

  if (!place) {
    const error = new HttpError("Could not find a place for this id.", 404);
    return next(error);
  }

  // try {
  //   const sess = await mongoose.startSession();
  //   sess.startTransaction();
  //   await place.remove({ session: sess, validateModifiedOnly: true });
  //   place.creatorId.places.pull(place);
  //   place.comments.placeId.pull();
  //   place.comments.creatorId.pull();

  //   await place.creatorId.save({ session: sess });
  //   await sess.commitTransaction();
  // } catch (err) {
  //   const error = new HttpError(
  //     "Something went wrong, could not delete place.",
  //     500
  //   );
  //   return next(error);
  // }
};

// Comments Section

const createComment = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { commentText, postCommentDate, placeId, creatorId } = req.body;

  const createdComment = new Comment({
    commentText,
    postCommentDate,
    creatorId,
    placeId,
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

exports.getPlaceById = getPlaceById;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;

exports.createComment = createComment;

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
