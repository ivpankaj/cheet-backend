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
    ref: "Video3",
    required: true,
  },
}, { timestamps: true });

const CommentvideoModel3 = mongoose.model("Comment3", commentSchema);

export default CommentvideoModel3;
