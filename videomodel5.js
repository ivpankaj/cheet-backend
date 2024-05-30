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

const VideoModel5 = mongoose.model('Video5', videoSchema);

export default VideoModel5;
