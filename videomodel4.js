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

const VideoModel4 = mongoose.model('Video4', videoSchema);

export default VideoModel4;