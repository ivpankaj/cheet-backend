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
    ref: "Video5",
    required: true,
  },
}, { timestamps: true });

const CommentvideoModel5 = mongoose.model("Comment5", commentSchema);

export default CommentvideoModel5;
