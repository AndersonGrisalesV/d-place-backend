const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const Place = require("../models/place");
const User = require("../models/user");
const Comment = require("../models/comment");

const getAllPlaces = async (req, res, next) => {
  let places;

  try {
    places = await Place.find({}, "-address -location");
    console.log(places);
  } catch (err) {
    const error = new HttpError(
      "There was a problem retrieving the places, please try again later.",
      500
    );
    return next(error);
  }
  res.json({
    places: places.map((place) => place.toObject({ getters: true })),
  });
};

exports.getAllPlaces = getAllPlaces;
