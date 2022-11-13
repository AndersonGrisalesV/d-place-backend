const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const User = require("../models/user");
const Place = require("../models/place");

const getAllUsers = async (req, res, next) => {
  // Finds all users of the website
  let users;
  try {
    users = await User.find({}, "-password -confirmPassword");
  } catch (err) {
    const error = new HttpError(
      "It was not possible to fetch all users, please try again later.",
      500
    );
    return next(error);
  }

  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  // Finds user places
  let userWithPlaces;
  try {
    userWithPlaces = await User.findById(userId).populate({
      path: "places",
      model: Place,
    });
  } catch (err) {
    const error = new HttpError(
      "It was not possible to fetch the user places, please try again later.",
      500
    );
    return next(error);
  }

  if (!userWithPlaces || userWithPlaces.places.length === 0) {
    return next(
      new HttpError("Could not find places for the provided user Id.", 404)
    );
  }

  res.json({
    places: userWithPlaces.places.map((place) =>
      place.toObject({ getters: true })
    ),
  });
};

const getFavoritePlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  // Finds user favorite places if user has it(them) as favorite
  let userWithFavoritePlaces;
  try {
    userWithFavoritePlaces = await User.findById(userId).populate({
      path: "favorites",
      model: Place,
      // populate: { path: "comments" },
    });

    console.log(userWithFavoritePlaces);
  } catch (err) {
    const error = new HttpError(
      "It was not possible to fecth favorite user places, please try again later.",
      500
    );
    return next(error);
  }

  if (!userWithFavoritePlaces || userWithFavoritePlaces.places.length === 0) {
    return next(
      new HttpError(
        "Could not find favorite user places for the provided user Id.",
        404
      )
    );
  }

  res.json({
    places: userWithFavoritePlaces.favorites.map((place) =>
      place.toObject({ getters: true })
    ),
  });
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { name, email, password, confirmPassword } = req.body;

  // Finds if user already exists by email
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Signing up failed, please try again later.",
      500
    );
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError(
      "User already exists, please login instead.",
      422
    );
    return next(error);
  }

  // Defines new user's Schema
  const createdUser = new User({
    name,
    email,
    password,
    confirmPassword,
    image:
      "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
    favorites: [],
    places: [],
    comments: [],
  });

  // Saves new user
  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError("Signing up failed, please try again.", 500);
    return next(error);
  }

  res.status(201).json({ user: createdUser.toObject({ getters: true }) });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  // Finds if user already exists
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Logging in failed, please try again later.",
      500
    );
    return next(error);
  }

  if (!existingUser || existingUser.password !== password) {
    const error = new HttpError("Invalid Email or Password, try again.", 401);
    return next(error);
  }

  res.json({ message: `Welcome back: ${existingUser.name}` });
};

exports.getAllUsers = getAllUsers;
exports.getPlacesByUserId = getPlacesByUserId;
exports.getFavoritePlacesByUserId = getFavoritePlacesByUserId;
exports.signup = signup;
exports.login = login;
