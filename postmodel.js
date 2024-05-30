import mongoose, { Schema } from "mongoose";

const postSchema = new Schema(
  {
    data: String,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    picture :{
      type:String,
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

const Postmodel = mongoose.model("Post", postSchema);

export default Postmodel;
