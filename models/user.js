const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  //   userId: "u1",
  name: { type: String, required: true, minLength: 4 },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minLength: 5 },
  confirmPassword: { type: String, required: true, minLength: 5 },
  image: { type: String, required: false },
  favorites: [{ type: Schema.Types.ObjectId, required: true, ref: "Place" }],
  places: [{ type: Schema.Types.ObjectId, required: true, ref: "Place" }],
  comments: [{ type: Schema.Types.ObjectId, required: true, ref: "Comment" }],
});

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model("User", userSchema);
