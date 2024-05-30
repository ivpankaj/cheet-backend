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
    ref: "Video4",
    required: true,
  },
}, { timestamps: true });

const CommentvideoModel4 = mongoose.model("Comment4", commentSchema);

export default CommentvideoModel4;
