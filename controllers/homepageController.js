const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const Place = require("../models/place");
const User = require("../models/user");
const Comment = require("../models/comment");

const getAllPlaces = async (req, res, next) => {
  let places;

  try {
    places = await Place.find({}, "-address -location").populate({
      path: "creatorId",
      model: User,
    });
  } catch (err) {
    const error = new HttpError(
      "It was not possible to fetch the places, please try again later.",
      500
    );
    return next(error);
  }

  res.json({
    places: places.map((place) => place.toObject({ getters: true })),
  });
};

const getAllComments = async (req, res, next) => {
  let comments;

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
    const error = new HttpError(
      "It was not possible to fetch the comments, please try again later.",
      500
    );
    return next(error);
  }

  res.json({
    comments: comments.map((comment) => comment.toObject({ getters: true })),
  });
};

exports.getAllPlaces = getAllPlaces;
exports.getAllComments = getAllComments;
