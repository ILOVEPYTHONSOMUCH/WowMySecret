
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");
const Friendship = require("../models/Friendship");
const Chat = require("../models/Chat");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user.id;
    const uploadPath = path.join(__dirname, "../../uploads", userId, "chat-media");
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, and common document types
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  }
});

// Helper function to find friendship between two users
async function findFriendshipBetweenUsers(userId1, userId2) {
  return await Friendship.findOne({
    $or: [
      { requester: userId1, recipient: userId2 },
      { requester: userId2, recipient: userId1 }
    ]
  });
}

// @route   GET /api/chat/chats
router.get("/chats", auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const chats = await Chat.find({ participants: userId })
      .populate("participants", "username email avatar")
      .populate("lastMessage.sender", "username")
      .sort({ updatedAt: -1 });
    
    // Transform chats to include otherParticipant
    const transformedChats = chats.map(chat => {
      const otherParticipant = chat.participants.find(
        p => p._id.toString() !== userId
      );
      
      return {
        ...chat.toObject(),
        chatId: chat._id,
        otherParticipant: otherParticipant
      };
    });
    
    res.json(transformedChats);
  } catch (err) {
    console.error(err.message);
    next(err);
  }
});

// @route   POST /api/chat/get-or-create-chat
router.post("/get-or-create-chat", auth, async (req, res, next) => {
  try {
    const { otherUserId } = req.body;
    const currentUserId = req.user.id;

    if (currentUserId === otherUserId) {
      return res.status(400).json({ error: "Cannot chat with yourself" });
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      participants: { $all: [currentUserId, otherUserId] }
    }).populate("participants", "username email avatar");

    if (!chat) {
      // Create new chat
      chat = new Chat({
        participants: [currentUserId, otherUserId],
        messages: []
      });
      await chat.save();
      
      // Populate the participants
      await chat.populate("participants", "username email avatar");
    }

    // Get the other participant info
    const otherParticipant = chat.participants.find(
      p => p._id.toString() !== currentUserId
    );

    res.json({
      chatId: chat._id,
      otherParticipant: otherParticipant,
      chat: chat
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/chat/conversation/:chatId
router.get("/conversation/:chatId", auth, async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const chat = await Chat.findById(chatId)
      .populate("participants", "username email avatar")
      .populate("messages.sender", "username email avatar");

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    // Check if user is participant
    const isParticipant = chat.participants.some(
      p => p._id.toString() === userId
    );

    if (!isParticipant) {
      return res.status(403).json({ error: "Not authorized to view this chat" });
    }

    res.json(chat);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   POST /api/chat/send
router.post("/send", auth, async (req, res, next) => {
  try {
    const { to, message, media } = req.body;
    const senderId = req.user.id;

    if (!to || (!message && !media)) {
      return res.status(400).json({ error: "Recipient and message/media required" });
    }

    // Find or create chat
    let chat = await Chat.findOne({
      participants: { $all: [senderId, to] }
    });

    if (!chat) {
      chat = new Chat({
        participants: [senderId, to],
        messages: []
      });
    }

    // Add message
    const newMessage = {
      sender: senderId,
      text: message || "",
      media: media || "",
      createdAt: new Date()
    };

    chat.messages.push(newMessage);
    
    // Update last message
    chat.lastMessage = {
      text: message || "Media",
      sender: senderId,
      createdAt: new Date()
    };

    await chat.save();

    // Populate sender info for response
    await chat.populate("messages.sender", "username email avatar");
    
    res.json({
      success: true,
      message: "Message sent successfully",
      chat: chat
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   POST /api/chat/friends/request
router.post("/friends/request", auth, async (req, res, next) => {
  try {
    const { recipientId } = req.body;
    const requesterId = req.user.id;

    if (requesterId === recipientId)
      return res.status(400).json({ msg: "You cannot send a request to yourself." });

    const recipient = await User.findById(recipientId);
    if (!recipient)
      return res.status(404).json({ msg: "Recipient not found." });

    // Check for existing friendship in both directions
    const existingFriendship = await findFriendshipBetweenUsers(
      requesterId,
      recipientId,
    );

    if (existingFriendship) {
      if (existingFriendship.status === "accepted")
        return res
          .status(400)
          .json({ msg: "You are already friends with this user." });
      else if (existingFriendship.status === "pending") {
        if (existingFriendship.requester.toString() === requesterId)
          return res
            .status(400)
            .json({ msg: "Friend request already sent to this user." });
        else
          return res
            .status(400)
            .json({
              msg: "This user has already sent you a friend request.",
            });
      } else if (existingFriendship.status === "blocked") {
        if (existingFriendship.requester.toString() === requesterId)
          return res
            .status(400)
            .json({ msg: "You have blocked this user. Cannot send request." });
        else
          return res
            .status(400)
            .json({
              msg: "You are blocked by this user. Cannot send request.",
            });
      } else if (existingFriendship.status === "declined") {
        existingFriendship.status = "pending";
        existingFriendship.requester = requesterId;
        existingFriendship.recipient = recipientId;
        await existingFriendship.save();
        return res
          .status(200)
          .json({
            msg: "Friend request re-sent successfully.",
            friendship: existingFriendship,
          });
      }
    }

    // Use findOneAndUpdate with upsert to handle race conditions
    const newFriendship = await Friendship.findOneAndUpdate(
      {
        $or: [
          { requester: requesterId, recipient: recipientId },
          { requester: recipientId, recipient: requesterId }
        ]
      },
      {
        requester: requesterId,
        recipient: recipientId,
        status: "pending"
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    res
      .status(201)
      .json({
        msg: "Friend request sent successfully.",
        friendship: newFriendship,
      });
  } catch (err) {
    console.error("Error in friend request:", err.message);

    // Handle duplicate key error specifically
    if (err.code === 11000) {
      return res.status(400).json({ 
        msg: "Friend request already exists or there was a conflict. Please try again." 
      });
    }

    next(err);
  }
});

// @route   POST /api/chat/friends/accept/:friendshipId
router.post("/friends/accept/:friendshipId", auth, async (req, res, next) => {
  try {
    const friendshipId = req.params.friendshipId;
    const userId = req.user.id;
    const friendship = await Friendship.findById(friendshipId);
    if (!friendship)
      return res.status(404).json({ msg: "Friend request not found." });
    if (friendship.recipient.toString() !== userId)
      return res
        .status(401)
        .json({ msg: "Not authorized to accept this request." });
    if (friendship.status !== "pending")
      return res
        .status(400)
        .json({
          msg: `Friend request is not pending. Current status: ${friendship.status}`,
        });
    
    friendship.status = "accepted";
    await friendship.save();

    // Create a new chat between the two users
    const existingChat = await Chat.findOne({
      participants: { $all: [friendship.requester, friendship.recipient] }
    });

    if (!existingChat) {
      const chat = new Chat({
        participants: [friendship.requester, friendship.recipient],
        messages: [],
      });
      await chat.save();
    }

    res.json({ msg: "Friend request accepted.", friendship });
  } catch (err) {
    console.error(err.message);
    next(err);
  }
});

// @route   POST /api/chat/friends/decline/:friendshipId
router.post("/friends/decline/:friendshipId", auth, async (req, res, next) => {
  try {
    const friendshipId = req.params.friendshipId;
    const userId = req.user.id;
    const friendship = await Friendship.findById(friendshipId);
    if (!friendship)
      return res.status(404).json({ msg: "Friend request not found." });
    if (friendship.recipient.toString() !== userId)
      return res
        .status(401)
        .json({ msg: "Not authorized to decline this request." });
    if (friendship.status !== "pending")
      return res
        .status(400)
        .json({
          msg: `Friend request is not pending. Current status: ${friendship.status}`,
        });
    friendship.status = "declined";
    await friendship.save();
    res.json({ msg: "Friend request declined.", friendship });
  } catch (err) {
    console.error(err.message);
    next(err);
  }
});

// @route   POST /api/chat/friends/reject
router.post("/friends/reject", auth, async (req, res, next) => {
  try {
    const { requesterId } = req.body;
    const userId = req.user.id;

    const friendship = await Friendship.findOne({
      requester: requesterId,
      recipient: userId,
      status: "pending"
    });

    if (!friendship)
      return res.status(404).json({ msg: "Friend request not found." });

    friendship.status = "declined";
    await friendship.save();
    res.json({ msg: "Friend request rejected.", friendship });
  } catch (err) {
    console.error(err.message);
    next(err);
  }
});

// @route   POST /api/chat/friends/withdraw
router.post("/friends/withdraw", auth, async (req, res, next) => {
  try {
    const { recipientId } = req.body;
    const userId = req.user.id;

    const friendship = await Friendship.findOne({
      requester: userId,
      recipient: recipientId,
      status: "pending"
    });

    if (!friendship)
      return res.status(404).json({ msg: "Friend request not found." });

    await friendship.deleteOne();
    res.json({ msg: "Friend request withdrawn successfully." });
  } catch (err) {
    console.error(err.message);
    next(err);
  }
});

// @route   DELETE /api/chat/friends/remove/:friendId
router.post("/friends/remove", auth, async (req, res, next) => {
  try {
    const { friendId } = req.body;
    console.log(req.params);
    const userId = req.user.id;
    console.log(userId);
    const friendship = await findFriendshipBetweenUsers(userId, friendId);
    if (!friendship)
      return res.status(404).json({ msg: "Friendship not found." });
    const isParticipant =
      friendship.requester.toString() === userId ||
      friendship.recipient.toString() === userId;
    if (!isParticipant || friendship.status !== "accepted")
      return res
        .status(400)
        .json({
          msg: "Cannot remove this user or friendship not established as accepted.",
        });
    await friendship.deleteOne();
    res.json({ msg: "Friend removed successfully." });
  } catch (err) {
    console.error(err.message);
    next(err);
  }
});

// @route   POST /api/chat/friends/block/:userIdToBlock
router.post("/friends/block/:userIdToBlock", auth, async (req, res, next) => {
  try {
    const userIdToBlock = req.params.userIdToBlock;
    const userId = req.user.id;
    if (userId === userIdToBlock)
      return res.status(400).json({ msg: "You cannot block yourself." });
    const userToBlock = await User.findById(userIdToBlock);
    if (!userToBlock)
      return res.status(404).json({ msg: "User to block not found." });
    let friendship = await findFriendshipBetweenUsers(userId, userIdToBlock);
    if (friendship) {
      friendship.status = "blocked";
      await friendship.save();
      return res.json({ msg: "User blocked successfully.", friendship });
    } else {
      friendship = new Friendship({
        requester: userId,
        recipient: userIdToBlock,
        status: "blocked",
      });
      await friendship.save();
      return res
        .status(201)
        .json({ msg: "User blocked successfully.", friendship });
    }
  } catch (err) {
    console.error(err.message);
    next(err);
  }
});

// @route   POST /api/chat/friends/unblock/:userIdToUnblock
router.post(
  "/friends/unblock/:userIdToUnblock",
  auth,
  async (req, res, next) => {
    try {
      const userIdToUnblock = req.params.userIdToUnblock;
      const userId = req.user.id;
      const friendship = await findFriendshipBetweenUsers(
        userId,
        userIdToUnblock,
      );
      if (!friendship)
        return res
          .status(404)
          .json({ msg: "No block relationship found with this user." });
      if (friendship.status !== "blocked")
        return res
          .status(400)
          .json({ msg: "This user is not currently blocked." });
      await friendship.deleteOne();
      res.json({ msg: "User unblocked successfully." });
    } catch (err) {
      console.error(err.message);
      next(err);
    }
  },
);

// @route   GET /api/chat/friends
router.get("/friends", auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const friendships = await Friendship.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: "accepted",
    })
      .populate("requester", "username email avatar")
      .populate("recipient", "username email avatar");
    const friends = friendships.map((friendship) => {
      if (friendship.requester._id.toString() === userId) {
        return {
          id: friendship.recipient._id,
          username: friendship.recipient.username,
          email: friendship.recipient.email,
          avatar: friendship.recipient.avatar,
          friendshipId: friendship._id,
          status: friendship.status,
        };
      } else {
        return {
          id: friendship.requester._id,
          username: friendship.requester.username,
          email: friendship.requester.email,
          avatar: friendship.requester.avatar,
          friendshipId: friendship._id,
          status: friendship.status,
        };
      }
    });
    res.json(friends);
  } catch (err) {
    console.error(err.message);
    next(err);
  }
});

// @route   GET /api/chat/friends/requests/sent
router.get("/friends/requests/sent", auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const sentRequests = await Friendship.find({
      requester: userId,
      status: "pending",
    }).populate("recipient", "username email avatar");
    res.json(sentRequests);
  } catch (err) {
    console.error(err.message);
    next(err);
  }
});

// @route   GET /api/chat/friends/requests/received
router.get("/friends/requests/received", auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const receivedRequests = await Friendship.find({
      recipient: userId,
      status: "pending",
    }).populate("requester", "username email avatar");
    res.json(receivedRequests);
  } catch (err) {
    console.error(err.message);
    next(err);
  }
});

// @route   GET /api/chat/friends/status/:otherUserId
router.get("/friends/status/:otherUserId", auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const otherUserId = req.params.otherUserId;
    if (userId === otherUserId) return res.status(200).json({ status: "self" });
    const friendship = await findFriendshipBetweenUsers(userId, otherUserId);
    if (!friendship) return res.status(200).json({ status: "none" });
    let status = friendship.status;
    if (status === "pending") {
      if (friendship.requester.toString() === userId) {
        status = "pending_sent";
      } else {
        status = "pending_received";
      }
    } else if (status === "blocked") {
      if (friendship.requester.toString() === userId) {
        status = "blocked_by_you";
      } else {
        status = "blocked_you";
      }
    }
    res.json({ status: status, friendshipId: friendship._id });
  } catch (err) {
    console.error(err.message);
    next(err);
  }
});

// @route   POST /api/chat/send-media
router.post("/send-media", auth, upload.single('file'), async (req, res, next) => {
  try {
    const { to } = req.body;
    const senderId = req.user.id;
    
    if (!to) {
      return res.status(400).json({ error: "Recipient required" });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: "File required" });
    }

    // Find or create chat
    let chat = await Chat.findOne({
      participants: { $all: [senderId, to] }
    });

    if (!chat) {
      chat = new Chat({
        participants: [senderId, to],
        messages: []
      });
    }

    // Generate relative path
    const relativePath = path.join(
      'uploads',
      req.user.id,
      'chat-media',
      req.file.filename
    ).replace(/\\/g, '/');

    // Create new message
    const newMessage = {
      sender: senderId,
      text: "",
      media: relativePath,
      createdAt: new Date()
    };

    // Add message and update chat
    chat.messages.push(newMessage);
    chat.lastMessage = {
      text: req.file.mimetype.startsWith('image/') ? "Image" : 
            req.file.mimetype.startsWith('video/') ? "Video" : "File",
      sender: senderId,
      createdAt: new Date()
    };

    // Save the chat first
    await chat.save();

    // Then populate the entire chat
    const populatedChat = await Chat.findById(chat._id)
      .populate({
        path: "messages.sender",
        select: "username email avatar"
      })
      .populate({
        path: "participants",
        select: "username email avatar"
      });

    res.json({
      success: true,
      message: "Media sent successfully",
      chat: populatedChat,
      fileInfo: {
        originalName: req.file.originalname,
        storedPath: relativePath,
        mimeType: req.file.mimetype
      }
    });

  } catch (err) {
    console.error('Error in send-media:', err);
    res.status(500).json({ 
      error: "Server error",
      details: err.message 
    });
  }
});

// @route   GET /api/chat/media/:userId/:filename
router.get("/media/:userId/:filename", (req, res) => {
  const { userId, filename } = req.params;
  const filePath = path.join(__dirname, "../uploads", userId, "chat-media", filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: "File not found" });
  }
});

module.exports = router;