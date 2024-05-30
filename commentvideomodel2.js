// commentModel.js

import mongoose, { Schema } from "mongoose";

const commentSchema = new Schema({
  text: {
    type: String,
    required: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  videoId: {
    type: Schema.Types.ObjectId,
    ref: "Video2",
    required: true,
  },
}, { timestamps: true });

const CommentvideoModel2 = mongoose.model("Comment2", commentSchema);

export default CommentvideoModel2;
