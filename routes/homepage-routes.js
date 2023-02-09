const express = require("express");
const { check } = require("express-validator");

// Import the homepageController
const homepageController = require("../controllers/homepageController");

// Create an instance of the express router
const router = express.Router();

// Define the route for the GET request to the homepage
router.get("/", homepageController.getAllPlaces);

// Define the route for the GET request to get all comments
router.get("/comments", homepageController.getAllComments);

module.exports = router;
