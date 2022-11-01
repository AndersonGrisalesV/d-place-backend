const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const getCoordinatesForAddress = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");
const Comment = require("../models/comment");

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

exports.createPlace = createPlace;

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
