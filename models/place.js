const mongoose = require("mongoose");

// Creating a new Schema using mongoose
const Schema = mongoose.Schema;

// Defining the place schema with its properties
const placeSchema = new Schema({
  // property for the place's title
  title: { type: String, required: true, maxLength: 67 },
  // property for the place's description
  description: { type: String, required: true, maxLength: 377 },
  // property for the place's image Url
  imageUrl: {
    public_id: {
      type: String,
    },
    url: {
      type: String,
    },
  },
  // property for the place's address
  address: { type: String, required: true, maxLength: 99 },
  // property for the user's ID who have the pace as a favorite one
  favoritesUserIds: [
    { type: Schema.Types.ObjectId, required: true, ref: "User" },
  ],
  // property for the place's location
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  postDate: { type: Date, required: true },
  // property for the place's share count
  shareCount: { type: Number, required: false },
  // property for the user's ID who created the place
  creatorId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  // property for the comment's ID related to the place that owns those comments
  comments: [{ type: Schema.Types.ObjectId, required: true, ref: "Comment" }],
});

// Export the Place model, using the placeSchema
module.exports = mongoose.model("Place", placeSchema);
