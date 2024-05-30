import express from "express";
import UserModel from "./models.js";
import bcrypt from "bcrypt";
const router = express.Router();
import jwt from "jsonwebtoken";
import { blacklist, verifyToken } from "./verifyToken.js";
import Postmodel from "./postmodel.js";
import CommentModel from "./commentmodel.js";
import { config } from "dotenv";
import multer from "multer";
import path from 'path';
import VideoModel from "./videomodel.js";
import VideoModel2 from "./videomodel2.js";
import VideoModel3 from "./videomodel3.js";
import VideoModel4 from "./videomodel4.js";
import VideoModel5 from "./videomodel5.js";
import CommentvideoModel from "./commentvideomodel.js";
import CommentvideoModel2 from "./commentvideomodel2.js";
import CommentvideoModel3 from "./commentvideomodel3.js";
import CommentvideoModel4 from "./commentvideomodel4.js";
import CommentvideoModel5 from "./commentvideomodel5.js";
config();
const secret_key = process.env.JWT_SECRET;


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./downloads"); // Specify the destination folder where videos will be saved
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname); // Rename the file to avoid duplicates
  },
});
const upload = multer({ storage: storage });
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed'));
  }
};
const upload2 = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5 MB file size limit
  fileFilter: fileFilter,
});

router.post("/auth/register", upload2.single('avatar'), async (req, res) => {
  try {
    const { username, email, password , bio} = req.body;
    const userExists = await UserModel.findOne({username});

    if (userExists) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new UserModel({
      username,
      email,
      password: hashedPassword,
      bio,
      avatar: req.file ? req.file.path : null, // Save the file path
    });

    await newUser.save();
    return res.status(201).json({ message: "User has been created, now login" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create user", error: error.message });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "User is not registered" });
    }

    //bcrypt
    const passwordmatch = await bcrypt.compare(password, user.password);
    if (!passwordmatch) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    //generate token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      secret_key,
      {
        expiresIn: "3h",
      }
    );
    res.json({ token, user });
    console.log("login successful");
  } catch (error) {
    console.error("Failed to login:", error);
    res.status(500).json({ message: "Failed to login" });
  }
});

router.post("/auth/logout", verifyToken, (req, res) => {
  try {
    const token = req.token;
    blacklist.add(token); // Add token to blacklist
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Error logging out:", error);
    res.status(500).json({ message: "Failed to logout" });
  }
});

router.get("/auth/user", verifyToken, async (req, res) => {
  try {
    const userId = req.userId; // Retrieve userId from the request object
    const user = await UserModel.findById(userId).select("-password"); // Exclude password from the response
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/auth/tweets/create", verifyToken, upload.single("picture"), async (req, res) => {
  try {
    const { data } = req.body;
    const userId = req.userId; // Retrieve userId from the verified token
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create the tweet
    const tweet = new Postmodel({
      data,
      createdBy: userId,
      picture: req.file ? req.file.path : null, // Save the file path if an image is uploaded
    });

    await tweet.save();

    // Populate createdBy field with username
    await tweet.populate("createdBy", "username");

    res.json({ message: "Tweet created successfully", tweet });
  } catch (error) {
    console.error("Error creating tweet:", error);
    res.status(500).json({ message: "Failed to create tweet" });
  }
});

router.get("/auth/tweets", verifyToken, async (req, res) => {
  try {
    // Find all tweets and sort them by creation date in descending order
    const tweets = await Postmodel.find()
      .populate('createdBy', 'username avatar')
      .sort({ createdAt: -1 })
      .exec();

    // If no tweets found, return 404
    if (!tweets || tweets.length === 0) {
      return res.status(404).json({ message: "No tweets found" });
    }

    // Return the tweets
    res.json({ message: "Tweets fetched successfully", tweets });
  } catch (error) {
    console.error("Error fetching tweets:", error);
    res.status(500).json({ message: "Failed to fetch tweets" });
  }
});


router.post("/auth/tweets/:postId/like", verifyToken, async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.userId;

    // Check if the post exists
    const post = await Postmodel.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if the user has already liked the post
    if (post.likes.includes(userId)) {
      return res
        .status(400)
        .json({ message: "You have already liked this post" });
    }

    // Add the user ID to the likes array
    post.likes.push(userId);
    await post.save();

    res.json({ message: "Post liked successfully" });
  } catch (error) {
    console.error("Error liking post:", error);
    res.status(500).json({ message: "Failed to like post" });
  }
});

router.delete("/auth/tweets/:postId/dislike", verifyToken, async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.userId;

    // Check if the post exists
    const post = await Postmodel.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if the user has already liked the post
    if (!post.likes.includes(userId)) {
      return res
        .status(400)
        .json({ message: "You haven't liked this post yet" });
    }

    // Remove the user ID from the likes array and decrement the like count
    post.likes.pull(userId);
    post.likeCount -= 1;

    // Save the updated post
    await post.save();

    res.json({ message: "Post disliked successfully" });
  } catch (error) {
    console.error("Error disliking post:", error);
    res.status(500).json({ message: "Failed to dislike post" });
  }
});

// Add this endpoint to your existing router

router.post("/auth/tweets/:postId/comments", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    const userId = req.userId;
    const postId = req.params.postId;

    // Check if the post exists
    const post = await Postmodel.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Create the comment
    const comment = new CommentModel({
      text,
      createdBy: userId,
      postId,
    });

    // Save the comment
    await comment.save();
    await comment.populate("createdBy", "username");
    res.json({ message: "Comment posted successfully", comment });
  } catch (error) {
    console.error("Error posting comment:", error);
    res.status(500).json({ message: "Failed to post comment" });
  }
});

router.get("/auth/tweets/:postId/comment", verifyToken, async (req, res) => {
  try {
    const postId = req.params.postId;

    // Fetch all comments for the given post
    const comments = await CommentModel.find({ postId }).populate(
      "createdBy",
      "username"
    );

    res.json({ comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
});

router.get("/auth/tweets/:postId/likes", verifyToken, async (req, res) => {
  try {
    const postId = req.params.postId;

    // Check if the post exists
    const post = await Postmodel.findById(postId).populate("likes", "username");
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Get the total number of likes and the users who liked the post
    const totalLikes = post.likes.length;
    const usersWhoLiked = post.likes.map((user) => ({
      username: user.username,
    }));

    res.json({ totalLikes, usersWhoLiked });
  } catch (error) {
    console.error("Error fetching likes:", error);
    res.status(500).json({ message: "Failed to fetch likes" });
  }
});

router.post("/auth/follow/:followedUserId", verifyToken, async (req, res) => {
  try {
    const followedUserId = req.params.followedUserId;
    const userId = req.userId; // assuming this is set by verifyToken middleware

    // Check if the user to be followed exists
    const followedUser = await UserModel.findById(followedUserId);
    if (!followedUser) {
      return res.status(404).json({ message: "User to follow not found" });
    }

    // Check if the user is already followed
    if (followedUser.followers.includes(userId)) {
      return res
        .status(400)
        .json({ message: "You are already following this user" });
    }

    // Update the following list of the current user
    await UserModel.findByIdAndUpdate(userId, {
      $push: { following: followedUserId },
    });

    // Update the followers list of the followed user
    await UserModel.findByIdAndUpdate(followedUserId, {
      $push: { followers: userId },
    });

    res.json({ message: "Successfully followed the user" });
  } catch (error) {
    console.error("Error following user:", error);
    res.status(500).json({ message: "Failed to follow user" });
  }
});

router.post(
  "/auth/unfollow/:unfollowedUserId",
  verifyToken,
  async (req, res) => {
    try {
      const unfollowedUserId = req.params.unfollowedUserId;
      const userId = req.userId; // assuming this is set by verifyToken middleware

      // Check if the user to be unfollowed exists
      const unfollowedUser = await UserModel.findById(unfollowedUserId);
      if (!unfollowedUser) {
        return res.status(404).json({ message: "User to unfollow not found" });
      }

      // Check if the user is actually followed
      if (!unfollowedUser.followers.includes(userId)) {
        return res
          .status(400)
          .json({ message: "You are not following this user" });
      }

      // Update the following list of the current user
      await UserModel.findByIdAndUpdate(userId, {
        $pull: { following: unfollowedUserId },
      });

      // Update the followers list of the unfollowed user
      await UserModel.findByIdAndUpdate(unfollowedUserId, {
        $pull: { followers: userId },
      });

      res.json({ message: "Successfully unfollowed the user" });
    } catch (error) {
      console.error("Error unfollowing user:", error);
      res.status(500).json({ message: "Failed to unfollow user" });
    }
  }
);

router.get("/auth/user/:userId/followers", verifyToken, async (req, res) => {
  try {
    const userId = req.params.userId;

    // Check if the user exists
    const user = await UserModel.findById(userId).populate(
      "followers",
      "username"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get the total number of followers and the usernames of the followers
    const totalFollowers = user.followers.length;
    const usersWhoFollowed = user.followers.map((follower) => ({
      username: follower.username,
    }));

    res.json({ totalFollowers, usersWhoFollowed });
  } catch (error) {
    console.error("Error fetching followers:", error);
    res.status(500).json({ message: "Failed to fetch followers" });
  }
});

router.get("/auth/user/:userId/following", verifyToken, async (req, res) => {
  try {
    const userId = req.params.userId;

    // Check if the user exists
    const user = await UserModel.findById(userId).populate(
      "following",
      "username"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get the total number of users followed and their usernames
    const totalFollowing = user.following.length;
    const usersBeingFollowed = user.following.map((followedUser) => ({
      username: followedUser.username,
    }));

    res.json({ totalFollowing, usersBeingFollowed });
  } catch (error) {
    console.error("Error fetching following:", error);
    res.status(500).json({ message: "Failed to fetch following" });
  }
});

router.get("/auth/mytweets", verifyToken, async (req, res) => {
  try {
    // Retrieve userId from the vpoerified token
    const userId = req.userId;

    // Find all tweets created by the user
    const tweets = await Postmodel.find({ createdBy: userId })
      .populate("createdBy", "username")
      .sort({ createdAt: -1 });

    // If no tweets found, return 404
    if (!tweets || tweets.length === 0) {
      return res.status(404).json({ message: "No tweets found" });
    }

    // Return the tweets
    res.json({ message: "Tweets fetched successfully", tweets });
  } catch (error) {
    console.error("Error fetching tweets:", error);
    res.status(500).json({ message: "Failed to fetch tweets" });
  }
});

router.delete("/auth/tweets/:tweetId", verifyToken, async (req, res) => {
  //most important for deleting tweet
  try {
    const userId = req.userId; // Retrieve userId from the verified token
    const tweetId = req.params.tweetId;

    // Check if the tweet exists and is created by the current user
    const tweet = await Postmodel.findOne({ _id: tweetId, createdBy: userId });
    if (!tweet) {
      return res.status(404).json({
        message: "Tweet not found or you are not authorized to delete it",
      });
    }

    // If the tweet exists and is created by the user, delete it
    await Postmodel.deleteOne({ _id: tweetId });

    res.json({ message: "Tweet deleted successfully" });
  } catch (error) {
    console.error("Error deleting tweet:", error);
    res.status(500).json({ message: "Failed to delete tweet" });
  }
});





///first video cluster
router.post(
  "/auth/videos/create",
  verifyToken,
  upload.single("video"),
  async (req, res) => {
    try {
      const { title, description } = req.body; // Assuming title and description are sent in the request body
      const userId = req.userId; // Retrieve userId from the verified token
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get the file information from req.file
      const videoUrl = req.file.path; // Assuming Multer saves the file path to req.file.path

      // Create the video post
      const videoPost = new VideoModel({
        title,
        description,
        videoUrl,
        createdBy: userId,
      });
      await videoPost.save();

      res.json({ message: "Video posted successfully", videoPost });
    } catch (error) {
      console.error("Error posting video:", error);
      res.status(500).json({ message: "Failed to post video" });
    }
  }
);

router.get("/auth/videos", verifyToken, async (req, res) => {
  try {
    const videos = await VideoModel.find()
      .populate("createdBy", "username avatar")
      .sort({ createdAt: -1 })
      .exec();// Populate createdBy field with user details
    res.json(videos);
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ message: "Failed to fetch videos" });
  }
});

router.post("/auth/videos/:videoId/like", verifyToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.userId;

    // Find the video by its ID
    const video = await VideoModel.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Check if the user has already liked the video
    const alreadyLiked = video.likes.includes(userId);
    if (alreadyLiked) {
      return res
        .status(400)
        .json({ message: "You have already liked this video" });
    }

    // Add the user's ID to the list of likes
    video.likes.push(userId);
    await video.save();

    res.json({ message: "Video liked successfully", video });
  } catch (error) {
    console.error("Error liking video:", error);
    res.status(500).json({ message: "Failed to like video" });
  }
});
router.post("/auth/videos/:videoId/dislike", verifyToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.userId;

    // Find the video by its ID
    const video = await VideoModel.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Check if the user has liked the video
    const likedIndex = video.likes.indexOf(userId);
    if (likedIndex === -1) {
      return res.status(400).json({ message: "You have not liked this video" });
    }

    // Remove the user's ID from the list of likes
    video.likes.splice(likedIndex, 1);
    await video.save();

    res.json({ message: "Video disliked successfully", video });
  } catch (error) {
    console.error("Error disliking video:", error);
    res.status(500).json({ message: "Failed to dislike video" });
  }
});

router.get("/auth/videos/:videoId/likes", async (req, res) => {
  try {
    const { videoId } = req.params;

    // Find the video by its ID
    const video = await VideoModel.findById(videoId).populate(
      "likes",
      "username"
    );
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Get the number of likes
    const likesCount = video.likes.length;

    // Get the users who have liked the video
    const usersWhoLiked = video.likes.map((user) => ({
      username: user.username,
    }));

    res.json({ likesCount, usersWhoLiked });
  } catch (error) {
    console.error("Error fetching likes:", error);
    res.status(500).json({ message: "Failed to fetch likes" });
  }
});
router.delete("/auth/videos/:videoId", verifyToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.userId;

    // Find the video by its ID
    const video = await VideoModel.findById({
      _id: videoId,
      createdBy: userId,
    });
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Check if the user is the creator of the video
    if (video.createdBy.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this video" });
    }

    // Delete the video
    await VideoModel.deleteOne({ _id: videoId });

    res.json({ message: "Video deleted successfully" });
  } catch (error) {
    console.error("Error deleting video:", error);
    res.status(500).json({ message: "Failed to delete video" });
  }
});
router.post("/auth/videos/:videoId/comment", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    const userId = req.userId;
    const videoId = req.params.videoId;

    // Check if the post exists
    const video = await VideoModel.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Create the comment
    const comment = new CommentvideoModel({
      text,
      createdBy: userId,
      videoId,
    });

    // Save the comment
    await comment.save();
    await comment.populate("createdBy", "username");
    res.json({ message: "Comment posted successfully", comment });
  } catch (error) {
    console.error("Error posting comment:", error);
    res.status(500).json({ message: "Failed to post comment" });
  }
});
router.get("/auth/videos/:videoId/comment", verifyToken, async (req, res) => {
  try {
    const videoId = req.params.videoId;

    // Fetch all comments for the given post
    const comments = await CommentvideoModel.find({ videoId }).populate(
      "createdBy",
      "username"
    );

    res.json({ comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
});
router.get("/auth/myvideos", verifyToken, async (req, res) => {
  try {
    // Retrieve userId from the vpoerified token
    const userId = req.userId;

    // Find all tweets created by the user
    const videos = await VideoModel.find({ createdBy: userId })
      .populate("createdBy", "username")
      .sort({ createdAt: -1 });

    // If no tweets found, return 404
    if (!videos || videos.length === 0) {
      return res.status(404).json({ message: "No tweets found" });
    }

    // Return the tweets
    res.json({ message: "videos fetched successfully", videos });
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ message: "Failed to fetch videos" });
  }
});
///second video cluster
router.post(
  "/auth/videos2/create",
  verifyToken,
  upload.single("video"),
  async (req, res) => {
    try {
      const { title, description } = req.body; // Assuming title and description are sent in the request body
      const userId = req.userId; // Retrieve userId from the verified token
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get the file information from req.file
      const videoUrl = req.file.path; // Assuming Multer saves the file path to req.file.path

      // Create the video post
      const videoPost = new VideoModel2({
        title,
        description,
        videoUrl,
        createdBy: userId,
      });
      await videoPost.save();

      res.json({ message: "Video posted successfully", videoPost });
    } catch (error) {
      console.error("Error posting video:", error);
      res.status(500).json({ message: "Failed to post video" });
    }
  }
);

router.get("/auth/videos2", verifyToken, async (req, res) => {
  try {
    const videos = await VideoModel2.find()
      .populate("createdBy", "username email")
      .sort({ createdAt: -1 }); // Populate createdBy field with user details
    res.json(videos);
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ message: "Failed to fetch videos" });
  }
});

router.post("/auth/videos2/:videoId/like", verifyToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.userId;

    // Find the video by its ID
    const video = await VideoModel2.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Check if the user has already liked the video
    const alreadyLiked = video.likes.includes(userId);
    if (alreadyLiked) {
      return res
        .status(400)
        .json({ message: "You have already liked this video" });
    }

    // Add the user's ID to the list of likes
    video.likes.push(userId);
    await video.save();

    res.json({ message: "Video liked successfully", video });
  } catch (error) {
    console.error("Error liking video:", error);
    res.status(500).json({ message: "Failed to like video" });
  }
});
router.post("/auth/videos2/:videoId/dislike", verifyToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.userId;

    // Find the video by its ID
    const video = await VideoModel2.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Check if the user has liked the video
    const likedIndex = video.likes.indexOf(userId);
    if (likedIndex === -1) {
      return res.status(400).json({ message: "You have not liked this video" });
    }

    // Remove the user's ID from the list of likes
    video.likes.splice(likedIndex, 1);
    await video.save();

    res.json({ message: "Video disliked successfully", video });
  } catch (error) {
    console.error("Error disliking video:", error);
    res.status(500).json({ message: "Failed to dislike video" });
  }
});
router.get("/auth/videos2/:videoId/likes", async (req, res) => {
  try {
    const { videoId } = req.params;

    // Find the video by its ID
    const video = await VideoModel2.findById(videoId).populate(
      "likes",
      "username"
    );
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Get the number of likes
    const likesCount = video.likes.length;

    // Get the users who have liked the video
    const usersWhoLiked = video.likes.map((user) => ({
      username: user.username,
    }));

    res.json({ likesCount, usersWhoLiked });
  } catch (error) {
    console.error("Error fetching likes:", error);
    res.status(500).json({ message: "Failed to fetch likes" });
  }
});
router.delete("/auth/videos2/:videoId", verifyToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.userId;

    // Find the video by its ID
    const video = await VideoModel2.findById({
      _id: videoId,
      createdBy: userId,
    });
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Check if the user is the creator of the video
    if (video.createdBy.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this video" });
    }

    // Delete the video
    await VideoModel2.deleteOne({ _id: videoId });

    res.json({ message: "Video deleted successfully" });
  } catch (error) {
    console.error("Error deleting video:", error);
    res.status(500).json({ message: "Failed to delete video" });
  }
});
router.post("/auth/videos2/:videoId/comment", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    const userId = req.userId;
    const videoId = req.params.videoId;

    // Check if the post exists
    const video = await VideoModel2.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Create the comment
    const comment = new CommentvideoModel2({
      text,
      createdBy: userId,
      videoId,
    });

    // Save the comment
    await comment.save();
    await comment.populate("createdBy", "username");
    res.json({ message: "Comment posted successfully", comment });
  } catch (error) {
    console.error("Error posting comment:", error);
    res.status(500).json({ message: "Failed to post comment" });
  }
});
router.get("/auth/videos2/:videoId/comment", verifyToken, async (req, res) => {
  try {
    const videoId = req.params.videoId;

    // Fetch all comments for the given post
    const comments = await CommentvideoModel2.find({ videoId }).populate(
      "createdBy",
      "username"
    );

    res.json({ comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
});
router.get("/auth/myvideos2", verifyToken, async (req, res) => {
  try {
    // Retrieve userId from the vpoerified token
    const userId = req.userId;

    // Find all tweets created by the user
    const videos = await VideoModel2.find({ createdBy: userId })
      .populate("createdBy", "username")
      .sort({ createdAt: -1 });

    // If no tweets found, return 404
    if (!videos || videos.length === 0) {
      return res.status(404).json({ message: "No tweets found" });
    }

    // Return the tweets
    res.json({ message: "videos fetched successfully", videos });
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ message: "Failed to fetch videos" });
  }
});
/////third video cluster
router.post(
  "/auth/videos3/create",
  verifyToken,
  upload.single("video"),
  async (req, res) => {
    try {
      const { title, description } = req.body; // Assuming title and description are sent in the request body
      const userId = req.userId; // Retrieve userId from the verified token
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get the file information from req.file
      const videoUrl = req.file.path; // Assuming Multer saves the file path to req.file.path

      // Create the video post
      const videoPost = new VideoModel2({
        title,
        description,
        videoUrl,
        createdBy: userId,
      });
      await videoPost.save();

      res.json({ message: "Video posted successfully", videoPost });
    } catch (error) {
      console.error("Error posting video:", error);
      res.status(500).json({ message: "Failed to post video" });
    }
  }
);

router.get("/auth/videos3", verifyToken, async (req, res) => {
  try {
    const videos = await VideoModel3.find()
      .populate("createdBy", "username email")
      .sort({ createdAt: -1 }); // Populate createdBy field with user details
    res.json(videos);
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ message: "Failed to fetch videos" });
  }
});
router.post("/auth/videos3/:videoId/like", verifyToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.userId;

    // Find the video by its ID
    const video = await VideoModel3.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Check if the user has already liked the video
    const alreadyLiked = video.likes.includes(userId);
    if (alreadyLiked) {
      return res
        .status(400)
        .json({ message: "You have already liked this video" });
    }

    // Add the user's ID to the list of likes
    video.likes.push(userId);
    await video.save();

    res.json({ message: "Video liked successfully", video });
  } catch (error) {
    console.error("Error liking video:", error);
    res.status(500).json({ message: "Failed to like video" });
  }
});
router.post("/auth/videos3/:videoId/dislike", verifyToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.userId;

    // Find the video by its ID
    const video = await VideoModel3.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Check if the user has liked the video
    const likedIndex = video.likes.indexOf(userId);
    if (likedIndex === -1) {
      return res.status(400).json({ message: "You have not liked this video" });
    }

    // Remove the user's ID from the list of likes
    video.likes.splice(likedIndex, 1);
    await video.save();

    res.json({ message: "Video disliked successfully", video });
  } catch (error) {
    console.error("Error disliking video:", error);
    res.status(500).json({ message: "Failed to dislike video" });
  }
});
router.get("/auth/videos3/:videoId/likes", async (req, res) => {
  try {
    const { videoId } = req.params;

    // Find the video by its ID
    const video = await VideoModel3.findById(videoId).populate(
      "likes",
      "username"
    );
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Get the number of likes
    const likesCount = video.likes.length;

    // Get the users who have liked the video
    const usersWhoLiked = video.likes.map((user) => ({
      username: user.username,
    }));

    res.json({ likesCount, usersWhoLiked });
  } catch (error) {
    console.error("Error fetching likes:", error);
    res.status(500).json({ message: "Failed to fetch likes" });
  }
});
router.delete("/auth/videos3/:videoId", verifyToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.userId;

    // Find the video by its ID
    const video = await VideoModel3.findById({
      _id: videoId,
      createdBy: userId,
    });
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Check if the user is the creator of the video
    if (video.createdBy.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this video" });
    }

    // Delete the video
    await VideoModel3.deleteOne({ _id: videoId });

    res.json({ message: "Video deleted successfully" });
  } catch (error) {
    console.error("Error deleting video:", error);
    res.status(500).json({ message: "Failed to delete video" });
  }
});
router.post("/auth/videos3/:videoId/comment", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    const userId = req.userId;
    const videoId = req.params.videoId;

    // Check if the post exists
    const video = await VideoModel3.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Create the comment
    const comment = new CommentvideoModel3({
      text,
      createdBy: userId,
      videoId,
    });

    // Save the comment
    await comment.save();
    await comment.populate("createdBy", "username");
    res.json({ message: "Comment posted successfully", comment });
  } catch (error) {
    console.error("Error posting comment:", error);
    res.status(500).json({ message: "Failed to post comment" });
  }
});
router.get("/auth/videos3/:videoId/comment", verifyToken, async (req, res) => {
  try {
    const videoId = req.params.videoId;

    // Fetch all comments for the given post
    const comments = await CommentvideoModel3.find({ videoId }).populate(
      "createdBy",
      "username"
    );

    res.json({ comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
});
router.get("/auth/myvideos3", verifyToken, async (req, res) => {
  try {
    // Retrieve userId from the vpoerified token
    const userId = req.userId;

    // Find all tweets created by the user
    const videos = await VideoModel3.find({ createdBy: userId })
      .populate("createdBy", "username")
      .sort({ createdAt: -1 });

    // If no tweets found, return 404
    if (!videos || videos.length === 0) {
      return res.status(404).json({ message: "No tweets found" });
    }

    // Return the tweets
    res.json({ message: "videos fetched successfully", videos });
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ message: "Failed to fetch videos" });
  }
});
///fourth video cluster
router.post(
  "/auth/videos4/create",
  verifyToken,
  upload.single("video"),
  async (req, res) => {
    try {
      const { title, description } = req.body; // Assuming title and description are sent in the request body
      const userId = req.userId; // Retrieve userId from the verified token
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get the file information from req.file
      const videoUrl = req.file.path; // Assuming Multer saves the file path to req.file.path

      // Create the video post
      const videoPost = new VideoModel4({
        title,
        description,
        videoUrl,
        createdBy: userId,
      });
      await videoPost.save();

      res.json({ message: "Video posted successfully", videoPost });
    } catch (error) {
      console.error("Error posting video:", error);
      res.status(500).json({ message: "Failed to post video" });
    }
  }
);
router.get("/auth/videos4", verifyToken, async (req, res) => {
  try {
    const videos = await VideoModel4.find()
      .populate("createdBy", "username email")
      .sort({ createdAt: -1 }); // Populate createdBy field with user details
    res.json(videos);
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ message: "Failed to fetch videos" });
  }
});
router.post("/auth/videos4/:videoId/like", verifyToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.userId;

    // Find the video by its ID
    const video = await VideoModel4.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Check if the user has already liked the video
    const alreadyLiked = video.likes.includes(userId);
    if (alreadyLiked) {
      return res
        .status(400)
        .json({ message: "You have already liked this video" });
    }

    // Add the user's ID to the list of likes
    video.likes.push(userId);
    await video.save();

    res.json({ message: "Video liked successfully", video });
  } catch (error) {
    console.error("Error liking video:", error);
    res.status(500).json({ message: "Failed to like video" });
  }
});
router.post("/auth/videos4/:videoId/dislike", verifyToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.userId;

    // Find the video by its ID
    const video = await VideoModel4.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Check if the user has liked the video
    const likedIndex = video.likes.indexOf(userId);
    if (likedIndex === -1) {
      return res.status(400).json({ message: "You have not liked this video" });
    }

    // Remove the user's ID from the list of likes
    video.likes.splice(likedIndex, 1);
    await video.save();

    res.json({ message: "Video disliked successfully", video });
  } catch (error) {
    console.error("Error disliking video:", error);
    res.status(500).json({ message: "Failed to dislike video" });
  }
});
router.get("/auth/videos4/:videoId/likes", async (req, res) => {
  try {
    const { videoId } = req.params;

    // Find the video by its ID
    const video = await VideoModel4.findById(videoId).populate(
      "likes",
      "username"
    );
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Get the number of likes
    const likesCount = video.likes.length;

    // Get the users who have liked the video
    const usersWhoLiked = video.likes.map((user) => ({
      username: user.username,
    }));

    res.json({ likesCount, usersWhoLiked });
  } catch (error) {
    console.error("Error fetching likes:", error);
    res.status(500).json({ message: "Failed to fetch likes" });
  }
});
router.delete("/auth/videos4/:videoId", verifyToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.userId;

    // Find the video by its ID
    const video = await VideoModel4.findById({
      _id: videoId,
      createdBy: userId,
    });
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Check if the user is the creator of the video
    if (video.createdBy.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this video" });
    }

    // Delete the video
    await VideoModel4.deleteOne({ _id: videoId });

    res.json({ message: "Video deleted successfully" });
  } catch (error) {
    console.error("Error deleting video:", error);
    res.status(500).json({ message: "Failed to delete video" });
  }
});
router.post("/auth/videos4/:videoId/comment", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    const userId = req.userId;
    const videoId = req.params.videoId;

    // Check if the post exists
    const video = await VideoModel4.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Create the comment
    const comment = new CommentvideoModel4({
      text,
      createdBy: userId,
      videoId,
    });

    // Save the comment
    await comment.save();
    await comment.populate("createdBy", "username");
    res.json({ message: "Comment posted successfully", comment });
  } catch (error) {
    console.error("Error posting comment:", error);
    res.status(500).json({ message: "Failed to post comment" });
  }
});
router.get("/auth/videos4/:videoId/comment", verifyToken, async (req, res) => {
  try {
    const videoId = req.params.videoId;

    // Fetch all comments for the given post
    const comments = await CommentvideoModel4.find({ videoId }).populate(
      "createdBy",
      "username"
    );

    res.json({ comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
});
router.get("/auth/myvideos4", verifyToken, async (req, res) => {
  try {
    // Retrieve userId from the vpoerified token
    const userId = req.userId;

    // Find all tweets created by the user
    const videos = await VideoModel4.find({ createdBy: userId })
      .populate("createdBy", "username")
      .sort({ createdAt: -1 });

    // If no tweets found, return 404
    if (!videos || videos.length === 0) {
      return res.status(404).json({ message: "No tweets found" });
    }

    // Return the tweets
    res.json({ message: "videos fetched successfully", videos });
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ message: "Failed to fetch videos" });
  }
});
///fifth video cluster
router.post(
  "/auth/videos5/create",
  verifyToken,
  upload.single("video"),
  async (req, res) => {
    try {
      const { title, description } = req.body; // Assuming title and description are sent in the request body
      const userId = req.userId; // Retrieve userId from the verified token
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get the file information from req.file
      const videoUrl = req.file.path; // Assuming Multer saves the file path to req.file.path

      // Create the video post
      const videoPost = new VideoModel5({
        title,
        description,
        videoUrl,
        createdBy: userId,
      });
      await videoPost.save();

      res.json({ message: "Video posted successfully", videoPost });
    } catch (error) {
      console.error("Error posting video:", error);
      res.status(500).json({ message: "Failed to post video" });
    }
  }
);
router.get("/auth/videos5", verifyToken, async (req, res) => {
  try {
    const videos = await VideoModel5.find()
      .populate("createdBy", "username email")
      .sort({ createdAt: -1 }); // Populate createdBy field with user details
    res.json(videos);
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ message: "Failed to fetch videos" });
  }
});
router.post("/auth/videos5/:videoId/like", verifyToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.userId;

    // Find the video by its ID
    const video = await VideoModel5.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Check if the user has already liked the video
    const alreadyLiked = video.likes.includes(userId);
    if (alreadyLiked) {
      return res
        .status(400)
        .json({ message: "You have already liked this video" });
    }

    // Add the user's ID to the list of likes
    video.likes.push(userId);
    await video.save();

    res.json({ message: "Video liked successfully", video });
  } catch (error) {
    console.error("Error liking video:", error);
    res.status(500).json({ message: "Failed to like video" });
  }
});
router.post("/auth/videos5/:videoId/dislike", verifyToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.userId;

    // Find the video by its ID
    const video = await VideoModel5.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Check if the user has liked the video
    const likedIndex = video.likes.indexOf(userId);
    if (likedIndex === -1) {
      return res.status(400).json({ message: "You have not liked this video" });
    }

    // Remove the user's ID from the list of likes
    video.likes.splice(likedIndex, 1);
    await video.save();

    res.json({ message: "Video disliked successfully", video });
  } catch (error) {
    console.error("Error disliking video:", error);
    res.status(500).json({ message: "Failed to dislike video" });
  }
});
router.get("/auth/videos5/:videoId/likes", async (req, res) => {
  try {
    const { videoId } = req.params;

    // Find the video by its ID
    const video = await VideoModel5.findById(videoId).populate(
      "likes",
      "username"
    );
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Get the number of likes
    const likesCount = video.likes.length;

    // Get the users who have liked the video
    const usersWhoLiked = video.likes.map((user) => ({
      username: user.username,
    }));

    res.json({ likesCount, usersWhoLiked });
  } catch (error) {
    console.error("Error fetching likes:", error);
    res.status(500).json({ message: "Failed to fetch likes" });
  }
});
router.delete("/auth/videos5/:videoId", verifyToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.userId;

    // Find the video by its ID
    const video = await VideoModel5.findById({
      _id: videoId,
      createdBy: userId,
    });
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Check if the user is the creator of the video
    if (video.createdBy.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this video" });
    }

    // Delete the video
    await VideoModel5.deleteOne({ _id: videoId });

    res.json({ message: "Video deleted successfully" });
  } catch (error) {
    console.error("Error deleting video:", error);
    res.status(500).json({ message: "Failed to delete video" });
  }
});
router.post("/auth/videos5/:videoId/comment", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    const userId = req.userId;
    const videoId = req.params.videoId;

    // Check if the post exists
    const video = await VideoModel5.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Create the comment
    const comment = new CommentvideoModel5({
      text,
      createdBy: userId,
      videoId,
    });

    // Save the comment
    await comment.save();
    await comment.populate("createdBy", "username");
    res.json({ message: "Comment posted successfully", comment });
  } catch (error) {
    console.error("Error posting comment:", error);
    res.status(500).json({ message: "Failed to post comment" });
  }
});
router.get("/auth/videos5/:videoId/comment", verifyToken, async (req, res) => {
  try {
    const videoId = req.params.videoId;

    // Fetch all comments for the given post
    const comments = await CommentvideoModel5.find({ videoId }).populate(
      "createdBy",
      "username"
    );

    res.json({ comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
});
router.get("/auth/myvideos5", verifyToken, async (req, res) => {
  try {
    // Retrieve userId from the vpoerified token
    const userId = req.userId;

    // Find all tweets created by the user
    const videos = await VideoModel5.find({ createdBy: userId })
      .populate("createdBy", "username")
      .sort({ createdAt: -1 });

    // If no tweets found, return 404
    if (!videos || videos.length === 0) {
      return res.status(404).json({ message: "No tweets found" });
    }

    // Return the tweets
    res.json({ message: "videos fetched successfully", videos });
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ message: "Failed to fetch videos" });
  }
});
export default router;
