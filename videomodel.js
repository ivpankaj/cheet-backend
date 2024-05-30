import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema(
  {
    description: String,
    videoUrl: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

const VideoModel = mongoose.model('Video', videoSchema);

export default VideoModel;
