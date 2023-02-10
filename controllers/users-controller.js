require("dotenv").config();
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

// Import the required models
const HttpError = require("../models/http-error");
const User = require("../models/user");
const Place = require("../models/place");
const Comment = require("../models/comment");

// Import cloudinary for image processing
const cloudinary = require("../util/cloudinary");

// Import the uuid library for generating unique ids
const { v4: uuidv4 } = require("uuid");

// Import ObjectId module from mongodb to be able to use its functionality
const ObjectId = require("mongodb").ObjectId;

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

//* getAllUsers function to get all users
const getAllUsers = async (req, res, next) => {
  // Finds all users of the website
  let users;
  try {
    users = await User.find({}, "-password -confirmPassword");
  } catch (err) {
    // If an error occurs, create a new HttpError with a message and a status code 500 (Internal Server Error) and return it to the next middleware
    const error = new HttpError(
      "It was not possible to fetch all users, please try again later.",
      500
    );
    return next(error);
  }
  // Returns the place data as a response in JSON format
  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

//* getUserById function to get a user by its ID
const getUserById = async (req, res, next) => {
  // Extracts the user ID from the request parameters
  const userId = req.params.uid;

  // Finds user by Id
  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    // If an error occurs, create a new HttpError with a message and a status code 500 (Internal Server Error) and return it to the next middleware
    const error = new HttpError(
      "Something went wrong, could not find user.",
      500
    );
    return next(error);
  }

  // If no user is found with the provided ID
  // Creates a new HttpError with a message and a status code 404 (Not Found) and return it to the next middleware
  if (!user) {
    const error = new HttpError(
      "Could not find a user for the provided Id.",
      404
    );
    return next(error);
  }

  // Returns the user data as a response in JSON format
  res.json({ user: user.toObject({ getters: true }) });
};

//* getPlacesByUserId function to get the places has created by its ID
const getPlacesByUserId = async (req, res, next) => {
  // Extracts the user ID from the request parameters
  const userId = req.params.uid;

  // Finds user places
  // Gets the places by user ID and populate related user (creatorId)
  let userWithPlaces;
  try {
    userWithPlaces = await User.findById(userId).populate({
      path: "places",
      model: Place,
      populate: { path: "creatorId" },
    });
  } catch (err) {
    // If an error occurs, create a new HttpError with a message and a status code 500 (Internal Server Error) and return it to the next middleware
    const error = new HttpError(
      "It was not possible to fetch the user places, please try again later.",
      500
    );
    return next(error);
  }

  // If no places are found or there aren't any with the provided ID
  // Creates a new HttpError with a message and a status code 404 (Not Found) and return it to the next middleware
  if (!userWithPlaces || userWithPlaces.places.length === 0) {
    return next(
      new HttpError("Could not find places for the provided user Id.", 404)
    );
  }

  // Returns the places data as a response in JSON format
  res.json({
    places: userWithPlaces.places.map((place) =>
      place.toObject({ getters: true })
    ),
  });
};

//* getFavoritePlacesByUserId function to get the favorite places of a user by its ID
const getFavoritePlacesByUserId = async (req, res, next) => {
  // Extracts the user ID from the request parameters
  const userId = req.params.uid;

  // Finds user favorite places if user has it(them) as favorite
  // Gets the places by user ID and populate related user (creatorId)
  let userWithFavoritePlaces;
  try {
    userWithFavoritePlaces = await User.findById(userId).populate({
      path: "favorites",
      model: Place,
      populate: { path: "creatorId" },
    });
  } catch (err) {
    // If an error occurs, create a new HttpError with a message and a status code 500 (Internal Server Error) and return it to the next middleware
    const error = new HttpError(
      "It was not possible to fecth favorite user places, please try again later.",
      500
    );
    return next(error);
  }

  // If no places are found or there aren't any with the provided ID
  // Creates a new HttpError with a message and a status code 404 (Not Found) and return it to the next middleware
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

  // Returns the places data as a response in JSON format
  res.json({
    places: userWithFavoritePlaces.favorites.map((place) =>
      place.toObject({ getters: true })
    ),
  });
};

// Sign up function to signup a user
const signup = async (req, res, next) => {
  // Check if there are errors from the validation middleware
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // If there are errors, return a custom error message with a 422 status code
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  // Destructure the input data from the request body
  const { name, email, notification, password, confirmPassword, theme, image } =
    req.body;

  // Find if user already exists with the given email
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    // If there is an error while checking for existing user, return a custom error message with a 500 status code
    const error = new HttpError(
      "Signing up failed, please try again later.",
      500
    );
    return next(error);
  }

  // If user with the given email already exists, return a custom error message with a 422 status code
  if (existingUser) {
    const error = new HttpError(
      "User already exists, please login instead.",
      422
    );
    return next(error);
  }

  // If an image is provided, upload the image to Cloudinary
  let result;
  if (image !== "") {
    try {
      result = await cloudinary.uploader.upload(image, {
        folder: "ProfilePictures",
      });
    } catch (error) {
      // If there is an error uploading the image, return a custom error message with a 400 status code
      return next(
        new HttpError(
          "Something went wrong when uploading the image, please try again.",
          400
        )
      );
    }
  }

  // Hash the password
  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    // If there is an error while hashing the password, return a custom error message with a 500 status code
    const error = new HttpError(
      "Could not create user, please try again.",
      500
    );
    return next(error);
  }

  // Define the schema for the new user
  const createdUser = new User({
    name,
    email,
    viewedNotification: notification,
    password: hashedPassword,
    confirmPassword: hashedPassword,
    themePreference: theme,
    imageUrl: {
      public_id: image !== "" ? result.public_id : uuidv4(),
      url: image !== "" ? result.secure_url : "",
    },
    favorites: [],
    places: [],
    comments: [],
  });

  // Saves new user
  try {
    await createdUser.save();
  } catch (err) {
    // If there is an error while saving the user, return a custom error message with a 500 status code
    const error = new HttpError("Signing up failed, please try again.", 500);
    return next(error);
  }

  // Sign the JWT token using userId and email
  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    // Handle the error if JWT signing failed
    const error = new HttpError("Signing up failed, please try again.", 500);

    return next(error);
  }

  // Set the user's theme preference as a cookie
  res.cookie("theme", createdUser.themePreference);

  // Return the successful response to the client with the JWT token, user information, and message
  res.status(201).json({
    message: "Welcome",
    user: createdUser.toObject({ getters: true }),
    userId: createdUser.id,
    email: createdUser.email,
    token: token,
  });
};

//* login function to login a user
const login = async (req, res, next) => {
  // Destructuring email and password from request body
  const { email, password } = req.body;

  // Finds if user already exists by email
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    // If there is an error in the database, returns a 500 error with message
    const error = new HttpError(
      "Logging in failed, please try again later.",
      500
    );
    return next(error);
  }

  // If the user does not exist, returns a 401 error with message
  if (!existingUser) {
    const error = new HttpError("Invalid Email or Password, try again.", 401);
    return next(error);
  }

  // Compares the provided password with the password stored in the database
  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    // If there is an error in comparing passwords, returns a 500 error with message
    const error = new HttpError(
      "Could not log you in, please check your credentials and try again.",
      500
    );
    return next(error);
  }

  // If the passwords do not match, returns a 401 error with message
  if (!isValidPassword) {
    const error = new HttpError(
      "Invalid credentials, could not log you in.",
      401
    );
    return next(error);
  }

  // If the passwords match, creates a JSON Web Token for authentication
  let token;
  try {
    token = jwt.sign(
      {
        userId: existingUser.id,
        email: existingUser.email,
      },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    // If there is an error in creating the token, returns a 500 error with message
    const error = new HttpError("Logging in failed, please try again.", 500);
    return next(error);
  }

  // Sends a success response to the client with the user information and JWT
  res.json({
    message: "Welcome back",
    user: existingUser.toObject({ getters: true }),
    userId: existingUser.id,
    email: existingUser.email,
    token: token,
  });
};

//* updateProfile function to update a user profile
const updateProfile = async (req, res, next) => {
  // Destructure the data from the request body
  const { name, email, oldPassword, password, confirmPassword, image } =
    req.body;

  // Extracts the user ID from the request parameters
  const userId = req.params.uid;

  // Finds user to update
  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    // Return error if there was a problem finding the user
    const error = new HttpError(
      "Something went wrong, could not update profile.",
      500
    );
    return next(error);
  }

  // Asigns new data to be updated if the values incoming fron the frontend are different from 'same'
  let hashedPassword;
  if (name !== "same") {
    user.name = name;
  }
  if (email !== "@same") {
    user.email = email;
  }
  if (password !== "same") {
    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(oldPassword, user.password);
    } catch (err) {
      // Return error if there was a problem comparing the password
      const error = new HttpError(
        "Please check your credentials and try again.",
        500
      );
      return next(error);
    }

    // Check if the old password is correct
    if (!isValidPassword) {
      const error = new HttpError(
        "Please check your credentials and try again.",
        401
      );
      return next(error);
    }

    // Hash the new password
    try {
      hashedPassword = await bcrypt.hash(password, 12);
    } catch (err) {
      // Return error if there was a problem hashing the password
      const error = new HttpError(
        "Could not create new passwrod for the user, please try again.",
        500
      );
      return next(error);
    }
    // Assigns the new password
    user.password = hashedPassword;
  }
  if (confirmPassword !== "same") {
    user.confirmPassword = hashedPassword;
  }

  // Delete the current image if the user wants to update it
  if (image !== "same" && image !== "noImage") {
    const ImgId = user.imageUrl.public_id;
    if (ImgId) {
      await cloudinary.uploader.destroy(ImgId);
    }
  }

  // Upload the new image
  let newImage;
  if (image !== "same" && image !== "noImage") {
    try {
      newImage = await cloudinary.uploader.upload(image, {
        folder: "ProfilePictures",
      });
    } catch (error) {
      // Return error if there was a problem uploading the image
      return next(
        new HttpError(
          "Something went wrong when uploading the image, please try again.",
          400
        )
      );
    }
  }

  // Check if the new image is different from the previous one or not selected
  if (image !== "same" && image !== "noImage") {
    // Set the new image URL if different
    user.imageUrl = {
      public_id: newImage.public_id,
      url: newImage.url,
    };
  }

  // Check if the user wants to remove the previous image
  if (image === "noImage") {
    // Get the public id of the previous image
    const ImgId = user.imageUrl.public_id;
    // If the previous image exists
    if (ImgId) {
      // Delete the previous image
      await cloudinary.uploader.destroy(ImgId);
    }
  }

  // Check if the user doesn't want to add a new image
  if (image === "noImage") {
    // Set the image URL as empty
    user.imageUrl = {
      public_id: uuidv4(),
      url: "",
    };
  }

  // Save the updated user information
  try {
    await user.save();
  } catch (err) {
    // If there is an error, return a 500 Internal Server Error response with a message
    const error = new HttpError(
      "Something went wrong, could not update place.",
      500
    );

    return next(error);
  }

  // Return a 200 OK response with the updated user information
  res.status(200).json({ user: user.toObject({ getters: true }) });
};

//* updateModePreference function to update a user's theme preference
const updateModePreference = async (req, res, next) => {
  // Extracts the user ID from the request parameters
  const userId = req.params.uid;

  // Destructures the data from the request body
  const { theme } = req.body;

  // FindS user by Id to update the theme preference
  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    // If there is any error while finding the user, return a 500 error with appropriate message
    const error = new HttpError(
      "Something went wrong, could not update theme preference.",
      500
    );
    return next(error);
  }

  // Checks if the user was found
  if (!user) {
    // Returns a 404 error if user was not found
    const error = new HttpError("Could not find this user.", 404);
    return next(error);
  }

  // Updates the theme preference of the user
  user.themePreference = theme;

  // Updates user
  try {
    await user.save();
  } catch (err) {
    // if there is an error while saving the user, return a 500 error with appropriate message
    const error = new HttpError(
      "Something went wrong, could not update p theme preference.",
      500
    );

    return next(error);
  }

  // Returns success message
  res.json({ message: "Theme preference successfully changed" });
};

//* updateNotification function updates the viewed notification status of a user
const updateNotification = async (req, res, next) => {
  // Extracts the user ID from the request parameters
  const userId = req.params.uid;

  // Destructures the data from the request body
  const { notification } = req.body;

  // Finds user by Id to update the viewed notification status
  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    // If there is any error while finding the user, return a 500 error with appropriate message
    const error = new HttpError(
      "Something went wrong, could not update viewed notification.",
      500
    );
    return next(error);
  }

  // Checks if the user was found
  if (!user) {
    // Returns a 404 error if user was not found
    const error = new HttpError("Could not find this user.", 404);
    return next(error);
  }

  // Updates the viewed notification status of the user
  user.viewedNotification = notification;

  // Updates user
  try {
    await user.save();
  } catch (err) {
    // If there is an error while saving the user, return a 500 error with appropriate message
    const error = new HttpError(
      "Something went wrong, could not update p theme preference.",
      500
    );

    return next(error);
  }

  // Returns success message
  res.json({ message: "Viewed notification successfully updated" });
};

//* updateUserNotification function updates the viewed notification status of a user (this function updates the viewedNotification property of all users)
const updateUserNotification = async (req, res, next) => {
  // Finds all users
  // Finds all users but exclude password, confirmPassword, comments, places, favorites, themePreference, imageUrl, name and email
  let users;
  try {
    users = await User.find(
      {},
      "-password -confirmPassword -comments -places -favorites -themePreference -imageUrl -name -email"
    );
  } catch (err) {
    // If it was not possible to fetch all users, returns an error with a message and a 500 status code
    const error = new HttpError(
      "It was not possible to fetch all users, please try again later.",
      500
    );
    return next(error);
  }

  // If no users are found
  if (!users) {
    // If no users were found, returns an error with a message and a 404 status code
    const error = new HttpError(
      "Could not find users to update notifications.",
      404
    );
    return next(error);
  }

  // Maps all users to updated the viewedNotification value
  let usersToUpdate = users.map(async (user) => {
    if (!user.viewedNotification) {
      try {
        // Creates a new ObjectId from the user id
        const newUid = new ObjectId(user._id);
        // Finds the user by its id and updates the viewedNotification property to true
        await User.findByIdAndUpdate(newUid, {
          $set: { viewedNotification: true },
        });
      } catch (err) {
        // If something went wrong updating the users viewed notification, returns an error with a message and a 500 status code
        const error = new HttpError(
          "Something went wrong, could not update users viewed notification.",
          500
        );

        return next(error);
      }
    }
  });

  // Returns a success message with a 200 status code
  res.json({ message: "Viewed user notification successfully updated" });
};

//* deleteProfile function to delete a user's profile
const deleteProfile = async (req, res, next) => {
  // Get the user ID from the request parameters
  const userId = req.params.uid;

  // Retrieve all places and their associated comments and creators
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

  // Retrieve the user's places
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

  // If the user doesn't exist, return an error
  if (!userPlaces) {
    const error = new HttpError("This user no longer exists.", 404);
    return next(error);
  }

  // Retrieve all users and their associated comments
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

    return next(error);
  }

  // Store the public ID of the user's profile picture
  let profilePictureToDelete;
  if (userPlaces.imageUrl.public_id) {
    profilePictureToDelete = userPlaces.imageUrl.public_id;
  }

  // Retrieve all comments
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

  // Arrays to store the IDs of places, comments, and images to delete
  let placesToDelete = []; // Also remove from users favorites
  let commentsToDelete = []; // Also remove from users comments
  let imageIdsToDelete = []; // Also remove from users comments

  // Loop through each place to determine which places, comments, and images to delete
  let placesAndCommentToDelete = places.map(async (place) => {
    let count = 0;
    let allCommentsFromPost = false;

    // If the place was created by the user, add its ID to the placesToDelete array
    if (place.creatorId._id == userId) {
      allCommentsFromPost = true;
      let placeId = [place._id];
      placesToDelete = [...placesToDelete, ...placeId];

      // Stores the public ID's of the place's to be deleted
      let imageId = [place.imageUrl.public_id];
      imageIdsToDelete = [...imageIdsToDelete, ...imageId];
    }

    // Loop through comments in the place and delete the comments created by the user
    if (place.comments) {
      let CommetsFromPlacesToDelete = place.comments.map(async (comment) => {
        if (comment.creatorId._id == userId || place.creatorId._id == userId) {
          let commentId = [comment._id];
          commentsToDelete = [...commentsToDelete, ...commentId];
          // Find the place by its id and update it to remove the comment
          const newId = new ObjectId(place._id);
          await Place.findByIdAndUpdate(newId, {
            $pull: { comments: comment },
          });

          // await place.comments.remove(commentId);
        }
      });
    }

    // Loop through the favorites in the place and delete the favorites of the user
    if (place.favoritesUserIds) {
      let CommetsFavoritesUserIdsFromPlacesToDelete =
        place.favoritesUserIds.map(async (favorite) => {
          if (favorite == userId) {
            // Find the place by its id and update it to remove the favorite of the user
            const newId = new ObjectId(place._id);
            await Place.findByIdAndUpdate(newId, {
              $pull: { favoritesUserIds: favorite },
            });
          }
        });
    }
  });

  // For each user, loop through all of its associated places
  let usersToDelete = retreivedUsersToDelete.map(async (user) => {
    if (user.places) {
      let placeFromUserToDelete = user.places.map(async (place) => {
        let placesDeleted = placesToDelete.map(async (id) => {
          // Check if the place to be deleted matches the current place
          if ((place = id)) {
            // If match found, remove the place from the user's places array
            const newUid = new ObjectId(user._id);
            await User.findByIdAndUpdate(newUid, {
              $pull: { places: place },
            });
          }
        });
      });
    }

    // For each user, loop through all of its associated favorites
    if (user.favorites) {
      let favoritesUser = user.favorites.map(async (favorite) => {
        let favoritesDeleted = placesToDelete.map(async (id) => {
          // Check if the place to be deleted matches the current favorite
          // or check if the user being deleted is the current user
          if ((favorite = id) || user._id == userId) {
            // If match found, remove the place from the user's favorites array
            const newUid = new ObjectId(user._id);
            await User.findByIdAndUpdate(newUid, {
              $pull: { favorites: favorite },
            });
          }
        });
      });
    }

    // For each user, loop through all of its associated comments
    if (user.comments) {
      let commentFromUserToDelete = user.comments.map(async (comment) => {
        let commentsDeleted = commentsToDelete.map(async (id) => {
          // Check if the comment to be deleted matches the current comment
          if ((comment._id = id)) {
            // If match found, remove the comment from the user's comments array
            const newUid = new ObjectId(user._id);
            await User.findByIdAndUpdate(newUid, {
              $pull: { comments: comment },
            });
          }
        });
      });
    }
  });

  // Delete all the comments, places and the user
  try {
    await Comment.deleteMany({ _id: { $in: [...commentsToDelete] } });
    await Place.deleteMany({ _id: { $in: [...placesToDelete] } });
    await User.deleteOne({ _id: userId });
    // Delete the profile picture from Cloudinary
    if (userPlaces.imageUrl.public_id) {
      await cloudinary.uploader.destroy(profilePictureToDelete);
    }
    // Deletes place's images from Cloudinary
    if (imageIdsToDelete.length) {
      await cloudinary.api.delete_resources(imageIdsToDelete);
    }
  } catch (err) {
    // If any error occurs, return a 500 error with a message
    const error = new HttpError(
      "Something went wrong, could not delete the profile.",
      500
    );

    return next(error);
  }

  // Return success message
  res.status(200).json({ message: "The profile was successfully deleted" });
};

exports.getAllUsers = getAllUsers;
exports.getUserById = getUserById;
exports.updateProfile = updateProfile;
exports.updateModePreference = updateModePreference;
exports.updateNotification = updateNotification;
exports.updateUserNotification = updateUserNotification;
exports.deleteProfile = deleteProfile;
exports.getPlacesByUserId = getPlacesByUserId;
exports.getFavoritePlacesByUserId = getFavoritePlacesByUserId;
exports.signup = signup;
exports.login = login;
