const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  //   userId: "u1",
  name: { type: String, required: true, minLength: 4 },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minLength: 5 },
  confirmPassword: { type: String, required: true, minLength: 5 },
  imageUrl: {
    public_id: {
      type: String,
      // required: true,
    },
    url: {
      type: String,
      // required: true,
    },
  },
  themePreference: { type: String, required: true },
  viewedNotification: { type: Boolean },
  favorites: [{ type: Schema.Types.ObjectId, required: true, ref: "Place" }],
  places: [{ type: Schema.Types.ObjectId, required: true, ref: "Place" }],
  comments: [{ type: Schema.Types.ObjectId, required: true, ref: "Comment" }],
});

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model("User", userSchema);
