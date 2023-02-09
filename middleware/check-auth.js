require("dotenv").config();
const jwt = require("jsonwebtoken");

// Importing the custom error module
const HttpError = require("../models/http-error");

module.exports = (req, res, next) => {
  // If the request method is "OPTIONS", proceed to the next middleware
  if (req.method === "OPTIONS") {
    return next();
  }
  try {
    // Get the token from the authorization header
    const token = req.headers.authorization.split(" ")[1]; // Authorization: 'Bearer TOKEN'
    // If there is no token provided, throw an error
    if (!token) {
      throw new Error("Authentication failed!");
    }
    // Verify the token and get the decoded token
    const decodedToken = jwt.verify(token, process.env.JWT_KEY);
    // Add the userId from the decoded token to the request object
    req.userData = { userId: decodedToken.userId };
    // Proceed to the next middleware
    next();
  } catch (err) {
    // If there is an error in the process, create a new HttpError with the message "Authentication failed!" and status code 403
    const error = new HttpError("Authentication failed!", 403);
    // Return the error to the next middleware to handle it
    return next(error);
  }
};
