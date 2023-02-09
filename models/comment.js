const mongoose = require("mongoose");

// Creating a new Schema using mongoose
const Schema = mongoose.Schema;

// Defining the comment schema with its properties
const commentSchema = new Schema({
  // property for the comment text
  commentText: { type: String, maxLength: 377 },
  // property for the comment's post date
  postCommentDate: { type: Date, required: true },
  // property for the place's ID related to the comment
  placeId: { type: Schema.Types.ObjectId, required: true, ref: "Place" },
  // property for the user's ID who created the comment
  creatorId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
});

// Export the Comment model, using the commentSchema
module.exports = mongoose.model("Comment", commentSchema);
