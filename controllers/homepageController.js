const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

// Import the required models
const HttpError = require("../models/http-error");
const Place = require("../models/place");
const User = require("../models/user");
const Comment = require("../models/comment");

//* getAllPlaces function to retrieve all places
const getAllPlaces = async (req, res, next) => {
  let places;

  // Retrieves all places, excluding the address and location properties, and populating the creatorId property with the User model
  try {
    places = await Place.find({}, "-address -location").populate({
      path: "creatorId",
      model: User,
    });
  } catch (err) {
    // If there is an error, create a new HttpError and return it to the next middleware
    const error = new HttpError(
      "It was not possible to fetch the places, please try again later.",
      500
    );
    return next(error);
  }

  // Sends the places in the response using getters
  res.json({
    places: places.map((place) => place.toObject({ getters: true })),
  });
};

//* getAllComments function to retrieve all comments
const getAllComments = async (req, res, next) => {
  let comments;

  // Retrieves all comments, excluding the postCommentDate property, and populating both the creatorId and placeId properties with the User and Place models, respectively
  try {
    comments = await Comment.find({}, "-postCommentDate")
      .populate({
        path: "creatorId",
        model: User,
      })
      .populate({
        path: "placeId",
        model: Place,
      });
  } catch (err) {
    // If there is an error, create a new HttpError and return it to the next middleware
    const error = new HttpError(
      "It was not possible to fetch the comments, please try again later.",
      500
    );
    return next(error);
  }

  // Sends the comments in the response using getters
  res.json({
    comments: comments.map((comment) => comment.toObject({ getters: true })),
  });
};

exports.getAllPlaces = getAllPlaces;
exports.getAllComments = getAllComments;
