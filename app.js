require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");

// Import the required routes
const homepageRoutes = require("./routes/homepage-routes");
const placesRoutes = require("./routes/places-routes");
const usersRoutes = require("./routes/users-routes");

// Import the required models
const HttpError = require("./models/http-error");

// const path = require("path");
var cors = require("cors");

// Initialize the express application
const app = express();

// Use cors middleware to handle cross-origin resource sharing
app.use(cors());

//*
// app.use(express.json());
// app.use(
//   express.json({
//     limit: "150mb",
//   })
// );

// Use express.json() middleware to parse JSON data in the request body
app.use(express.json());

// Use express.urlencoded() middleware to parse URL encoded data in the request body
app.use(
  express.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 })
);

//*
//app.use(express.urlencoded());
// app.use(express.static(path.join(__dirname, "public")));

// Set headers to allow access control
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  //*
  //  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS"
  );
  next();
});

// Use the defined routes for homepage, places and users
app.use("/api/homepage", homepageRoutes);
app.use("/api/places", placesRoutes);
app.use("/api/users", usersRoutes);

// Handle error for non-existing routes
app.use((req, res, next) => {
  const error = new HttpError("Could not find this route.", 404);
  throw error;
});

// Handle error for any thrown errors in the previous middlewares
app.use((error, req, res, next) => {
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || "An unknown error occurred" });
});

// Connect to the MongoDB database using the provided credentials
mongoose
  .connect(
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.bvvsm.mongodb.net/${process.env.MONGO_DATABASE}?retryWrites=true&w=majority`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    // Start the server on port 4000
    app.listen(4000, () => console.log("Server listening on port 4000."));
  })
  .catch((err) => {
    // show an error if something went wrong
    console.log(err);
  });
