const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const commentSchema = new Schema({
  // commentId: "co1",
  postCommentDate: { type: Date, required: true },
  commentText: { type: String, maxLength: 377 },
  placeId: { type: Schema.Types.ObjectId, required: true, ref: "Place" },
  //   title: {type: String, maxLength: 67},
  creatorId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  //   creatorId: "u1",
  //   creatorName: "Anderson",
  //   creatorImageUrl:
  //     "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSzHQv_th9wq3ivQ1CVk7UZRxhbPq64oQrg5Q&usqp=CAU",
});

module.exports = mongoose.model("Comment", commentSchema);
