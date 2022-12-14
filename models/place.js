const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const placeSchema = new Schema({
  //   placeId: "p1",
  title: { type: String, required: true, maxLength: 67 },
  description: { type: String, required: true, maxLength: 377 },
  // imageUrl: { type: String, required: true },
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
  address: { type: String, required: true, maxLength: 99 },
  // favorite: { type: Boolean, required: true },
  favoritesUserIds: [
    { type: Schema.Types.ObjectId, required: true, ref: "User" },
  ],
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  postDate: { type: Date, required: true },
  creatorId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  comments: [{ type: Schema.Types.ObjectId, required: true, ref: "Comment" }],
  //   creatorName: {
  //     type: String,
  //     required: true,
  //     minLength: 4,
  //     ref: "User",
  //   },
  //   creatorImageUrl:
  //     "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSzHQv_th9wq3ivQ1CVk7UZRxhbPq64oQrg5Q&usqp=CAU",
});

module.exports = mongoose.model("Place", placeSchema);
