const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

// Import the required models
const HttpError = require("../models/http-error");
const getCoordinatesForAddress = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");
const Comment = require("../models/comment");

// Import cloudinary for image processing
const cloudinary = require("../util/cloudinary");

// Import ObjectId module from mongodb to be able to use its functionality
const ObjectId = require("mongodb").ObjectId;

//* getPlaceById function to get a place by its ID
const getPlaceById = async (req, res, next) => {
  // Extracts the place ID from the request parameters
  const placeId = req.params.pid;

  // Finds place by Id
  // Gets the place by its ID and populate related comments and creatorId
  let place;
  try {
    place = await Place.findById(placeId)
      .populate({
        path: "comments",
        model: Comment,
        populate: { path: "creatorId" },
      })
      .populate({
        path: "creatorId",
        model: User,
      });
  } catch (err) {
    // If an error occurs, create a new HttpError with a message and a status code 500 (Internal Server Error) and return it to the next middleware
    const error = new HttpError(
      "Something went wrong, could not find place.",
      500
    );
    return next(error);
  }

  // If no place is found with the provided ID
  // Creates a new HttpError with a message and a status code 404 (Not Found) and return it to the next middleware
  if (!place) {
    const error = new HttpError(
      "Could not find a place for the provided Id.",
      404
    );
    return next(error);
  }

  // Returns the place data as a response in JSON format
  res.json({ place: place.toObject({ getters: true }) });
};

//* createPlace function to create a new place
const createPlace = async (req, res, next) => {
  // Checks if request contains validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  // Destructures place information from request body
  const { title, description, address, postDate, creatorId, image } = req.body;

  // Creates coordinates neccesary for the geolocation used by googleMaps
  let coordinates;
  try {
    coordinates = await getCoordinatesForAddress(address);
  } catch (error) {
    return next(error);
  }

  // Uploads the image to Cloudinary
  let result;
  try {
    result = await cloudinary.uploader.upload(image, {
      folder: "places",
    });
  } catch (error) {
    // If an error occurs,  404 (Not Found) and return it to the next middleware
    return next(
      new HttpError(
        "Something went wrong when uploading the image, please try again.",
        400
      )
    );
  }

  // Creates a new place with the new information
  const createdPlace = new Place({
    title,
    description,
    imageUrl: {
      public_id: result.public_id,
      url: result.secure_url,
    },
    address,
    favoritesUserIds: [],
    location: coordinates,
    postDate,
    creatorId,
    comments: [],
    shareCount: 0,
  });

  // Finds the user associated with the place to enable the creation
  let user;
  try {
    user = await User.findById(creatorId);
  } catch (err) {
    // Create a new HttpError with a message and a status code 500 (Internal Server Error) and return it to the next middleware
    const error = new HttpError(
      "It was not possible to create the place, please try again later.",
      500
    );
    return next(error);
  }

  // If no user is found with the provided ID
  if (!user) {
    const error = new HttpError(
      "Could not find user for the provided Id.",
      404
    );
    return next(error);
  }

  // Saves new place
  try {
    createdPlace.save();
  } catch (err) {
    const error = new HttpError(
      "It was not possible to create the place, please try again later.",
      500
    );
    return next(error);
  }

  // Saves new place for user on user's
  try {
    user.places.push(createdPlace);
    await user.save();
  } catch (err) {
    const error = new HttpError(
      "It was not possible to create the place, please try again later.",
      500
    );
    return next(error);
  }

  // Returns the created place data as a response in JSON format
  res.status(201).json({ place: createdPlace });
};

//* updateFavorites function to handle adding/removing a place to/from the user's favorites and the place's favoritesUserIds
const updateFavorites = async (req, res, next) => {
  // Gets the place ID from the URL parameters and user ID from the request body
  const placeId = req.params.pid;
  // Gets the user ID from the URL parameters and user ID from the request body
  const { userId } = req.body;

  // Finds place by Id
  let PlaceToCheckFavoritsUserIds;
  try {
    PlaceToCheckFavoritsUserIds = await Place.findById(placeId);
  } catch (err) {
    // If there's an error fetching the place, return a 500 Internal Server Error and return it to the next middleware
    const error = new HttpError(
      "It was not possible to fetch the user places, please try again later.",
      500
    );
    return next(error);
  }

  // If the place doesn't exist, return a 404 Not Found error
  if (!PlaceToCheckFavoritsUserIds) {
    const error = new HttpError("Could not find this place.", 404);
    return next(error);
  }

  // Initializes isFavorite flag to true
  let isFavorite = true;

  // If the place has favoritesUserIds
  if (PlaceToCheckFavoritsUserIds.favoritesUserIds) {
    // Loops through the favoritesUserIds array to see if the current user has already added this place to their favorites
    let favoritesUser = PlaceToCheckFavoritsUserIds.favoritesUserIds.map(
      async (favorite) => {
        // If the current user has already added this place to their favorites
        if (favorite == userId) {
          // Sets isFavorite flag to false
          isFavorite = false;
          // Converts the user ID to an ObjectId
          const newUid = new ObjectId(userId);
          // Removes the place from the user's favorites
          await User.findByIdAndUpdate(newUid, {
            $pull: { favorites: placeId },
          });
          // Converts the place ID to an ObjectId
          const newPid = new ObjectId(placeId);
          // Removes the user from the place's favoritesUserIds
          await Place.findByIdAndUpdate(newPid, {
            $pull: { favoritesUserIds: userId },
          });
        }
      }
    );
    // If the isFavorite flag is still true
    if (isFavorite) {
      // Converts the user ID to an ObjectId
      const newUid = new ObjectId(userId);
      // Adds the place to the user's favorites
      await User.findByIdAndUpdate(newUid, {
        $push: { favorites: placeId },
      });
      // Converts the place ID to an ObjectId
      const newPid = new ObjectId(placeId);
      // Adds the user to the place's favoritesUserIds
      await Place.findByIdAndUpdate(newPid, {
        $push: { favoritesUserIds: userId },
      });
    }
  }

  res.json({ favorite: isFavorite });
};

//* updateCountShare function to handle CountShare of a specific post
const updateCountShare = async (req, res, next) => {
  // Get the place ID from the request parameters
  const placeId = req.params.pid;

  // Finds place by Id
  let PlaceToupdateCountShares;
  try {
    PlaceToupdateCountShares = await Place.findById(placeId);
  } catch (err) {
    // If there's an error fetching the place, return a 500 Internal Server Error and return it to the next middleware
    const error = new HttpError(
      "It was not possible to fetch the places to update share count, please try again later.",
      500
    );
    return next(error);
  }

  // Returns a 404 error if the place was not found
  if (!PlaceToupdateCountShares) {
    const error = new HttpError("Could not find this place.", 404);
    return next(error);
  }

  // Gets the new share count from the request body
  const { newShare } = req.body;

  // Sets a flag to track whether the share count was successfully updated
  let isSharedPost = true;

  // Updates the share count for the place
  PlaceToupdateCountShares.shareCount =
    PlaceToupdateCountShares.shareCount + newShare;

  // Saves the updated place
  try {
    await PlaceToupdateCountShares.save();
  } catch (err) {
    // Sets the flag to false if there was a problem saving the place
    isSharedPost = false;
    const error = new HttpError(
      "Something went wrong, could not update place's share counts.",
      500
    );

    return next(error);
  }

  // Returns a JSON response with the sharePost flag
  res.json({ sharePost: isSharedPost });
};

//* updatePlace function to update a place
const updatePlace = async (req, res, next) => {
  // Checks if request contains validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }
  // Destructures place information from request body
  const { title, description, address, postDate, image } = req.body;
  // Get the place ID from the request parameters
  const placeId = req.params.pid;

  // Updates the coordinates if the address is different from 'same'
  let coordinates;
  if (address !== "same") {
    // Updates coordinates neccesary for the geolocation used by googleMaps
    try {
      coordinates = await getCoordinatesForAddress(address);
    } catch (error) {
      return next(error);
    }
  }

  // Finds the place to update
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

  // Asigns new data to be updated if the values incoming fron the frontend are different from 'same'
  if (title !== "same") {
    place.title = title;
  }
  if (description !== "same") {
    place.description = description;
  }
  if (address !== "same") {
    place.address = address;
    place.location = coordinates;
  }
  if (image !== "same") {
    // Deletes the existing image if the new image is different
    const ImgId = place.imageUrl.public_id;
    if (ImgId) {
      await cloudinary.uploader.destroy(ImgId);
    }
    // Uploads the new image
    let newImage;
    try {
      newImage = await cloudinary.uploader.upload(image, {
        folder: "places",
      });
    } catch (error) {
      return next(
        new HttpError(
          "Something went wrong when uploading the image, please try again.",
          400
        )
      );
    }
    // Updates the image URL
    place.imageUrl = {
      public_id: newImage.public_id,
      url: newImage.url,
    };
  }

  // Always changes the postDate to the new date made after the update
  place.postDate = postDate;

  // Saves the updated place to the database
  try {
    await place.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place.",
      500
    );

    return next(error);
  }

  // Returns the updated lace in JSON response
  res.status(200).json({ place: place.toObject({ getters: true }) });
};

//* deletePlace function to delete a place
const deletePlace = async (req, res, next) => {
  // Get the placeId from the request parameters
  const placeId = req.params.pid;
  // Save placeId with a different name for clearer distinction
  const plcid = req.params.pid;

  // Finds place to delete
  let place;
  try {
    place = await Place.findById(
      placeId,
      "favoritesUserIds, imageUrl"
    ).populate({
      path: "creatorId",
      model: User,
      populate: { path: "comments" },
    });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find the place to delete.",
      500
    );
    return next(error);
  }

  // If no place is found with the provided ID
  if (!place) {
    const error = new HttpError("Could not find a place for this Id.", 404);
    return next(error);
  }

  // Find all users who have comments on this place
  let retreivedUsersToDelete;
  try {
    retreivedUsersToDelete = await User.find({})
      .populate({
        path: "comments",
        model: Comment,
      })
      .populate({
        path: "favorites",
        model: Place,
        populate: { path: "favoritesUserIds" },
      });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find comments' owners from place to delete.",
      500
    );
    return next(error);
  }

  // Delete references to this place from all users
  let usersToDelete = retreivedUsersToDelete.map(async (user) => {
    // Delete reference to this place from the user's favorites
    let favoritesFromUserToDelete = user.favorites.map(async (favorite) => {
      if (user.favorites) {
        let favoritePlacesToDelete = favorite.favoritesUserIds.map(
          async (id) => {
            if (favorite._id == plcid) {
              await user.favorites.remove(plcid);
            }
          }
        );
      }
    });

    // Delete comments from this place made by this user
    if (user.comments) {
      let commentFromUserToDelete = user.comments.map(async (comment) => {
        if (comment.placeId == plcid) {
          const newUid = new ObjectId(user._id);
          await User.findByIdAndUpdate(newUid, {
            $pull: { comments: comment },
          });
          await User.findByIdAndUpdate(newUid, {
            $pull: { places: placeId },
          });
        }
      });
    }

    // Save changes to each user
    await user.save().catch((err) => {
      const error = new HttpError(
        "Something went wrong, could not delete comments from owners of the place.",
        500
      );
      return next(error);
    });
  });

  // Finds comments from this place to delete
  let retreivedCommentsToDelete;
  try {
    retreivedCommentsToDelete = await Comment.find({ placeId: plcid }).populate(
      {
        path: "placeId",
        model: Place,
      }
    );
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find comments to delete from the place.",
      500
    );
    return next(error);
  }

  // Deletes comments from this place
  let commentsToDelete = retreivedCommentsToDelete.map(async (comment) => {
    if (comment.placeId._id == plcid) {
      await comment.deleteOne({ _id: comment._id });
    }
  });

  // Deletes place
  // Removes reference from place stored in user's owner of the place
  try {
    //Deletes the image from cloduinary
    const ImgId = place.imageUrl.public_id;
    await cloudinary.uploader.destroy(ImgId);

    //! using the old method to remove references (later on the newest version of doing this is used)
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.remove({ session: sess, validateModifiedOnly: true });
    place.creatorId.places.pull(place);
    await place.creatorId.save({ session: sess });
    await sess.commitTransaction();

    // Finally after all references are removed the places is deleted
    await place.deleteOne({ places: place.creatorId });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete the place.",
      500
    );

    return next(error);
  }

  // Returns a message saying the places was successfully deleted
  res.status(200).json({ message: "The place was deleted." });
};

//* Comments Section /////////////////////////////////

//* createComment function to a create a comment for a specific place
const createComment = async (req, res, next) => {
  // Gets the place ID from the request parameters
  const placeId = req.params.pid;

  // Checks for validation errors
  const errors = validationResult(req);
  // If there are errors, return a new error with a message and a status code of 422 (Unprocessable Entity)
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  // Finds place to assign comment to
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    // If there's an error, return a new error with a message and a status code of 500 (Internal Server Error)
    const error = new HttpError(
      "Something went wrong, could not find a place.",
      500
    );
    return next(error);
  }

  // If the place is not found, return a new error with a message and a status code of 404 (Not Found)
  if (!place) {
    const error = new HttpError(
      "Could not find a place for the provided Id.",
      404
    );
    return next(error);
  }

  // Gets the comment text, post comment date, and creator ID from the request body
  const { commentText, postCommentDate, creatorId } = req.body;

  // Defines a new comment using the Comment schema
  const createdComment = new Comment({
    commentText,
    postCommentDate,
    creatorId,
    placeId: place._id,
  });

  // Finds user to assign comment to
  let user;
  try {
    user = await User.findById(creatorId);
  } catch (err) {
    // If there's an error, return a new error with a message and a status code of 500 (Internal Server Error)
    const error = new HttpError(
      "It was not possible to create the comment, please try again later.",
      500
    );
    return next(error);
  }

  // If the user is not found, return a new error with a message and a status code of 404 (Not Found)
  if (!user) {
    const error = new HttpError(
      "Could not find a user for the provided Id.",
      404
    );
    return next(error);
  }

  // Saves new comment
  try {
    createdComment.save();
  } catch (err) {
    // If there's an error, return a new error with a message and a status code of 500 (Internal Server Error)
    const error = new HttpError(
      "It was not possible to create the comment, please try again later.",
      500
    );
    return next(error);
  }

  // Saves new comment for this place
  try {
    place.comments.push(createdComment);
    await place.save();
  } catch (err) {
    // If there's an error, return a new error with a message and a status code of 500 (Internal Server Error)
    const error = new HttpError(
      "Something went wrong, could not create the comment for the place.",
      500
    );
    return next(error);
  }

  // Saves new comment from user
  try {
    user.comments.push(createdComment);
    await user.save();
  } catch (err) {
    // If there's an error, return a new error with a message and a status code of 500 (Internal Server Error)
    const error = new HttpError(
      "It was not possible to create the comment, please try again later.",
      500
    );
    return next(error);
  }

  // Returns the comment in JSON format
  res.status(201).json({ comment: createdComment });
};

//* updateComment function to update a comment for a specific place
const updateComment = async (req, res, next) => {
  // Check if there are any validation errors
  const errors = validationResult(req);
  // Return error if there are any validation errors
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  // Get the comment data from the request body
  const { commentText, postCommentDate } = req.body;
  // Get the comment ID from the request parameters
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

  // Asigns new data for the comment to beupdated
  comment.commentText = commentText;
  comment.postCommentDate = postCommentDate;

  // Updateds comment
  try {
    await comment.save();
  } catch (err) {
    // Return error if the comment could not be updated
    const error = new HttpError(
      "Something went wrong, could not update comment.",
      500
    );
    return next(error);
  }

  // Returns the comment in JSON format
  res.status(200).json({ comment: comment.toObject({ getters: true }) });
};

//* deleteComment function to delete a comment for a specific place
const deleteComment = async (req, res, next) => {
  // Get the placeId from the request parameters
  const placeId = req.params.pid;
  // Save placeId with a different name for clearer distinction
  const plcid = req.params.pid;
  // CommentId in the url parameters
  const commentId = req.params.cid;

  // Finds place to update comments in said place
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
  // If no place is found with the provided ID
  if (!place) {
    const error = new HttpError("Could not find a place for this Id.", 404);
    return next(error);
  }

  // Finds comment to delete said comment
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

  // If no comment is found with the provided ID
  if (!comment) {
    const error = new HttpError("Could not find a comment for this Id.", 404);
    return next(error);
  }

  // Finds user to delete reference from comment
  let commentUser;
  try {
    commentUser = await User.findById(comment.creatorId).populate({
      path: "comments",
      model: Comment,
    });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find owner of the comment.",
      500
    );
    return next(error);
  }

  // If no user is found with the provided ID
  if (!commentUser) {
    const error = new HttpError("Could not find a comment for this Id.", 404);
    return next(error);
  }

  // Checks if comment belongs to the place in which we want to delete said comment and remove it from the place
  if (comment.placeId._id == plcid) {
    let updatePlaceComments = comment.placeId.comments.map(async (id) => {
      if (id == commentId) {
        await place.comments.remove(id);
        return;
      }
    });

    // checks if comment belongs to user and removes said comment from user
    let updateUserComments = commentUser.comments.map(async (id) => {
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

    // Updates place's comments and deletes comment
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

  // Returns a message saying the places was successfully deleted
  res.status(200).json({ message: "The comment was deleted." });
};

exports.getPlaceById = getPlaceById;
exports.createPlace = createPlace;
exports.updateFavorites = updateFavorites;
exports.updateCountShare = updateCountShare;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;

exports.createComment = createComment;
exports.updateComment = updateComment;
exports.deleteComment = deleteComment;
