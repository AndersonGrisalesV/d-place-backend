const express = require("express");
const { check } = require("express-validator");

const homepageController = require("../controllers/homepageController");

const router = express.Router();

router.get("/", homepageController.getAllPlaces);

router.get("/comments", homepageController.getAllComments);

module.exports = router;
