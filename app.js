const express = require("express");
const mongoose = require("mongoose");

const homepageRoutes = require("./routes/homepage-routes");
const placesRoutes = require("./routes/places-routes");
const usersRoutes = require("./routes/users-routes");
const HttpError = require("./models/http-error");

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE")
  next();
});

app.use("/homepage", homepageRoutes);
app.use("/api/places", placesRoutes);
app.use("/api/users", usersRoutes);

app.use((req, res, next) => {
  const error = new HttpError("Could not find this route.", 404);
  throw error;
});

app.use((error, req, res, next) => {
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || "An unknown error occurred" });
});

mongoose
  .connect(
    "mongodb+srv://d-place-user:T1IvInZiTrWm2GI7@cluster0.bvvsm.mongodb.net/d_place?retryWrites=true&w=majority"
  )
  .then(() => {
    app.listen(4000, () => console.log("Server listening on port 4000."));
  })
  .catch((err) => {
    console.log(err);
  });
