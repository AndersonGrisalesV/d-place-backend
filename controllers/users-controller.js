const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const User = require("../models/user");
const Place = require("../models/place");
const Comment = require("../models/comment");

const cloudinary = require("../util/cloudinary");

const ObjectId = require("mongodb").ObjectId;

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

const getUserById = async (req, res, next) => {
  const userId = req.params.uid;

  // Finds user by Id
  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find user.",
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

  res.json({ user: user.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  // const { userId } = req.body;
  // Finds user places
  let userWithPlaces;
  try {
    userWithPlaces = await User.findById(userId).populate({
      path: "places",
      model: Place,
      populate: { path: "creatorId" },
    });
  } catch (err) {
    const error = new HttpError(
      "It was not possible to fetch the user places, please try again later.",
      500
    );
    return next(error);
  }

  // console.log(userWithPlaces.places.length);
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
      populate: { path: "creatorId" },
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

  if (
    !userWithFavoritePlaces ||
    userWithFavoritePlaces.favorites.length === 0
  ) {
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

  const { name, email, password, confirmPassword, image } = req.body;

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

  let result;

  try {
    result = await cloudinary.uploader.upload(image, {
      folder: "ProfilePictures",
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

  // Defines new user's Schema
  const createdUser = new User({
    name,
    email,
    password,
    confirmPassword,
    imageUrl: {
      public_id: result.public_id,
      url: result.secure_url,
    },
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

  res.status(201).json({
    message: "Welcome",
    user: createdUser.toObject({ getters: true }),
  });
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

  // res.json({ message: `Welcome back: ${existingUser.name}` });
  res.json({
    message: "Welcome back",
    user: existingUser.toObject({ getters: true }),
  });
};

const updateProfile = async (req, res, next) => {
  const errors = validationResult(req);

  // if (!errors.isEmpty()) {
  //   console.log(errors);
  //   return next(
  //     new HttpError("Invalid inputs passed, please check your data.", 422)
  //   );
  // }

  const { name, email, password, confirmPassword, image } = req.body;
  const userId = req.params.uid;

  // Finds user to update
  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update profile.",
      500
    );
    return next(error);
  }

  // Asigns new data to be updated

  if (name !== "same") {
    user.name = name;
  }
  if (email !== "@same") {
    user.email = email;
  }
  if (password !== "same") {
    user.password = password;
  }
  if (confirmPassword !== "same") {
    user.confirmPassword = confirmPassword;
  }
  if (image !== "same") {
    const ImgId = user.imageUrl.public_id;
    if (ImgId) {
      await cloudinary.uploader.destroy(ImgId);
    }

    let newImage;
    try {
      newImage = await cloudinary.uploader.upload(image, {
        folder: "ProfilePictures",
      });
    } catch (error) {
      return next(
        new HttpError(
          "Something went wrong when uploading the image, please try again.",
          400
        )
      );
    }

    user.imageUrl = {
      public_id: newImage.public_id,
      url: newImage.url,
    };
  }

  // Updates place
  try {
    await user.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place.",
      500
    );
    // console.log(err);
    return next(error);
  }
  res.status(200).json({ user: user.toObject({ getters: true }) });
};

const deleteProfile = async (req, res, next) => {
  const userId = req.params.uid;
  // plcid Same as placeId but stored with a different name for a clearer distinction
  // when comparing with a collection's specific name in this case placeId.

  // Finds comment to update
  let places;
  try {
    places = await Place.find({})
      .populate({
        path: "comments",
        model: Comment,
      })
      .populate({
        path: "creatorId",
        model: User,
      });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not retrieve places to delete.",
      500
    );
    return next(error);
  }

  // Finds user places
  let userPlaces;
  try {
    userPlaces = await User.findById(userId).populate({
      path: "places",
      model: Place,
      populate: { path: "comments" },
    });
  } catch (err) {
    const error = new HttpError(
      "It was not possible to fetch the user places, please try again later.",
      500
    );
    return next(error);
  }

  if (!userPlaces) {
    const error = new HttpError("This user no longer exists.", 404);
    return next(error);
  }
  // console.log(userPlaces);

  let retreivedUsersToDelete;
  try {
    retreivedUsersToDelete = await User.find({}).populate({
      path: "comments",
      model: Comment,
    });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find comments from owners of places to delete.",
      500
    );
    console.log(err);
    return next(error);
  }

  let profilePictureToDelete;
  if (userPlaces.imageUrl.public_id) {
    profilePictureToDelete = userPlaces.imageUrl.public_id;
  }

  let toDeleteComments;
  try {
    toDeleteComments = await Comment.find({});
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not retrieve comments.",
      500
    );
    return next(error);
  }

  let placesToDelete = []; //also remove from users favorites
  let commentsToDelete = []; //also remove from users comments
  let imageIdsToDelete = []; //also remove from users comments

  let placesAndCommentToDelete = places.map(async (place) => {
    let count = 0;
    let allCommentsFromPost = false;
    // console.log(place.creatorId);

    if (place.creatorId._id == userId) {
      allCommentsFromPost = true;
      let placeId = [place._id];
      placesToDelete = [...placesToDelete, ...placeId];

      let imageId = place.imageUrl.public_id;
      imageIdsToDelete = [...imageIdsToDelete, imageId];

      // await cloudinary.uploader.destroy(imageId);
    }

    if (place.comments) {
      let CommetsFromPlacesToDelete = place.comments.map(async (comment) => {
        // console.log(comment.creatorId._id);
        if (comment.creatorId._id == userId || place.creatorId._id == userId) {
          let commentId = [comment._id];
          commentsToDelete = [...commentsToDelete, ...commentId];
          // console.log(comment.creatorId._id);
          const newId = new ObjectId(place._id);
          await Place.findByIdAndUpdate(newId, {
            $pull: { comments: comment },
          });

          // await place.comments.remove(commentId);
        }
      });
    }

    if (place.favoritesUserIds) {
      let CommetsFavoritesUserIdsFromPlacesToDelete =
        place.favoritesUserIds.map(async (favorite) => {
          if (favorite == userId) {
            const newId = new ObjectId(place._id);
            await Place.findByIdAndUpdate(newId, {
              $pull: { favoritesUserIds: favorite },
            });
            //await place.favoritesUserIds.remove(userId);
          }
        });
    }
  });

  // Finds comment to update
  // let filteredPlacesToDelete;
  // try {
  //   filteredPlacesToDelete = await Place.find({
  //     _id: { $in: [...placesToDelete] },
  //   });
  // } catch (err) {
  //   const error = new HttpError(
  //     "Something went wrong, could not retrieve places to delete.",
  //     500
  //   );
  //   return next(error);
  // }

  // let comments;
  // try {
  //   comments = await Comment.find({ _id: { $in: [...commentsToDelete] } });
  // } catch (err) {
  //   const error = new HttpError(
  //     "Something went wrong, could not retrieve comments.",
  //     500
  //   );
  //   return next(error);
  // }

  console.log(commentsToDelete);

  // let allComments = comments.map(async (comment) => {
  // console.log(comment);
  // await comment.deleteOne({ _id: comment._id }).catch((err) => {
  //   const error = new HttpError(
  //     "Something went wrong, could not delete comments from the users places.",
  //     500
  //   );
  //   return next(error);
  // });

  // await comment.remove(comment._id);
  // });

  let usersToDelete = retreivedUsersToDelete.map(async (user) => {
    // console.log(user.favorites);

    if (user.places) {
      let placeFromUserToDelete = user.places.map(async (place) => {
        let placesDeleted = placesToDelete.map(async (id) => {
          if ((place = id)) {
            // console.log(id);
            const newUid = new ObjectId(user._id);
            await User.findByIdAndUpdate(newUid, {
              $pull: { places: place },
            });
            // await user.places.remove(place);
            // await Place.deleteOne({ _id: id });
          }
        });
      });
    }

    if (user.favorites) {
      let favoritesUser = user.favorites.map(async (favorite) => {
        let favoritesDeleted = placesToDelete.map(async (id) => {
          // console.log(id);
          if ((favorite = id) || user._id == userId) {
            console.log(favorite);
            const newUid = new ObjectId(user._id);
            await User.findByIdAndUpdate(newUid, {
              $pull: { favorites: favorite },
            });
            // await user.favorites.remove(favorite);
          }
        });
      });
    }

    if (user.comments) {
      let commentFromUserToDelete = user.comments.map(async (comment) => {
        let commentsDeleted = commentsToDelete.map(async (id) => {
          // console.log(comment);
          if ((comment._id = id)) {
            console.log(id);
            const newUid = new ObjectId(user._id);
            await User.findByIdAndUpdate(newUid, {
              $pull: { comments: comment },
            });
            // await user.comments.remove(comment);
          }
        });
      });
    }
  });

  try {
    await Comment.deleteMany({ _id: { $in: [...commentsToDelete] } });
    await Place.deleteMany({ _id: { $in: [...placesToDelete] } });
    await User.deleteOne({ _id: userId });
    if (userPlaces.imageUrl.public_id) {
      await cloudinary.uploader.destroy(profilePictureToDelete);
    }
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete the profile.",
      500
    );
    console.log(err);
    return next(error);
  }

  // let allPlaces = filteredPlacesToDelete.map(async (place) => {
  //   // console.log(place);
  //   await place.deleteOne({ _id: place._id });
  // });

  res.status(200).json({ message: "The profile was successfully deleted" });
};

exports.getAllUsers = getAllUsers;
exports.getUserById = getUserById;
exports.updateProfile = updateProfile;
exports.deleteProfile = deleteProfile;
exports.getPlacesByUserId = getPlacesByUserId;
exports.getFavoritePlacesByUserId = getFavoritePlacesByUserId;
exports.signup = signup;
exports.login = login;
