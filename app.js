require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");

const homepageRoutes = require("./routes/homepage-routes");
const placesRoutes = require("./routes/places-routes");
const usersRoutes = require("./routes/users-routes");
const HttpError = require("./models/http-error");

// const path = require("path");
var cors = require("cors");

const app = express();

app.use(cors());

// app.use(express.json());
// app.use(
//   express.json({
//     limit: "150mb",
//   })
// );

app.use(express.json());

app.use(
  express.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 })
);
//app.use(express.urlencoded());
// app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  //  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS"
  );
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
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.bvvsm.mongodb.net/${process.env.MONGO_DATABASE}?retryWrites=true&w=majority`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    app.listen(4000, () => console.log("Server listening on port 4000."));
  })
  .catch((err) => {
    console.log(err);
  });
