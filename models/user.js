const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

// Creating a new Schema using mongoose
const Schema = mongoose.Schema;

// Defining the user schema with its properties
const userSchema = new Schema({
  // property for the user's name
  name: { type: String, required: true, minLength: 4 },
  // property for the user's email
  email: { type: String, required: true, unique: true },
  // property for the user's password
  password: { type: String, required: true, minLength: 5 },
  // property for the user's confirm Password
  confirmPassword: { type: String, required: true, minLength: 5 },
  // property for the user's image Url
  imageUrl: {
    public_id: {
      type: String,
    },
    url: {
      type: String,
    },
  },
  // property for the user's themePreference
  themePreference: { type: String, required: true },
  // property for the user's viewedNotification
  viewedNotification: { type: Boolean },
  // property for the place's ID who has user save a favorite on that specific place
  favorites: [{ type: Schema.Types.ObjectId, required: true, ref: "Place" }],
  // property for the place's ID related to the user that owns those places
  places: [{ type: Schema.Types.ObjectId, required: true, ref: "Place" }],
  // property for the comment's ID related to the user that owns those comments
  comments: [{ type: Schema.Types.ObjectId, required: true, ref: "Comment" }],
});

// Apply uniqueValidator plugin to userSchema(email)
userSchema.plugin(uniqueValidator);

// Export the User model, using the userSchema
module.exports = mongoose.model("User", userSchema);
