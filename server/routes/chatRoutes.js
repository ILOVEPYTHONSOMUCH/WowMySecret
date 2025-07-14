// routes/chat.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // IMPORTANT: Assumes your auth middleware correctly sets req.user.id
const multer = require('../config/multerConfig'); // IMPORTANT: Assumes your multer configuration is correct for uploads
const { nanoid } = require('nanoid');
const Chat = require('../models/Chat'); // IMPORTANT: Make sure your Chat model is structured as expected
const User = require('../models/User'); // IMPORTANT: Make sure your User model is structured as expected
const Friendship = require('../models/Friendship'); // IMPORTANT: Make sure your Friendship model is structured as expected

// --- Helper Function ---
// This function is crucial for frontend to display media.
// It reconstructs the full URL for uploaded files.
const getFileUrl = (filePath) => {
    // IMPORTANT: process.env.API_BASE_URL must match the base URL of your backend server
    // Example: "http://YOUR_SERVER_IP:YOUR_PORT" (e.g., "http://192.168.1.100:6000")
    if (!filePath) return null;
    return `${process.env.API_BASE_URL}/api/file?path=${filePath.split('uploads\\')[1] || filePath.split('uploads/')[1]}`;
    // The path.split('uploads\\')[1] or path.split('uploads/')[1] extracts
    // the filename relative to the 'uploads' directory, which your static server
    // route (e.g., app.use('/api/file', express.static('uploads'))); expects.
    // Ensure your server.js has this static file serving setup.
};

// This function finds a friendship between two users, regardless of who is requester/recipient.
const findFriendshipBetweenUsers = async (userId1, userId2) => {
  return await Friendship.findOne({
    $or: [
      { requester: userId1, recipient: userId2 },
      { requester: userId2, recipient: userId1 }
    ]
  });
};
router.post('/conversation', auth, async (req, res, next) => {
  try {
    const { participantId } = req.body;
    
    // Debugging logs
    console.log(`Finding conversation between: ${req.user.id} and ${participantId}`);
    
    // Convert to ObjectIds
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const otherUserId = new mongoose.Types.ObjectId(participantId);
    
    console.log(`Converted IDs: ${userId} and ${otherUserId}`);

    let chat = await Chat.findOne({ 
      participants: { 
        $all: [userId, otherUserId],
        $size: 2
      }
    });

    if (!chat) {
      console.log('Creating new conversation');
      chat = new Chat({ 
        chatId: nanoid(8), 
        participants: [userId, otherUserId], 
        messages: [] 
      });
      await chat.save();
      console.log(`Created chat with ID: ${chat.chatId}`);
    } else {
      console.log(`Found existing chat: ${chat.chatId}`);
    }

    res.json({ chatId: chat.chatId });
  } catch (err) {
    console.error('Error in /conversation:', err.message);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});
// --- Existing Chat Routes ---

// Send Message
// Endpoint: POST /api/chat/send
router.post('/send', auth, multer.single('media'), async (req, res, next) => {
  try {
    const { to, message } = req.body;
    
    let chat = await Chat.findOne({ participants: { $all: [req.user.id, to] } });

    if (!chat) {
      chat = new Chat({ chatId: nanoid(8), participants: [req.user.id, to], messages: [] });
    }
    
    // Check for blocking status before allowing message
    const friendshipStatus = await findFriendshipBetweenUsers(req.user.id, to);
    if (friendshipStatus && friendshipStatus.status === 'blocked') {
        if (friendshipStatus.requester.toString() === to && friendshipStatus.recipient.toString() === req.user.id) {
            return res.status(403).json({ msg: 'You are blocked by this user and cannot send messages.' });
        } else if (friendshipStatus.requester.toString() === req.user.id && friendshipStatus.recipient.toString() === to) {
            return res.status(403).json({ msg: 'You have blocked this user and cannot send messages.' });
        }
    }

    // `req.file?.path` comes from multer and is the local path on the server.
    // Frontend will convert this to a full URL using `getFileUrl`.
    chat.messages.push({ sender: req.user.id, text: message, media: req.file?.path });
    await chat.save();
    res.json(chat); // Responds with the updated chat object
  } catch (err) {
    console.error(err.message);
    next(err);
  }
});

// List Chat Previews
// Endpoint: GET /api/chat/
router.get('/', auth, async (req, res, next) => {
  try {
    const chats = await Chat.find({ participants: req.user.id })
                           .sort({ 'messages.createdAt': -1 }); // Sort by latest message date

    const previews = await Promise.all(chats.map(async c => {
      const lastMessage = c.messages[c.messages.length - 1];
      const otherParticipantId = c.participants.find(p => p.toString() !== req.user.id);
      
      const otherParticipant = await User.findById(otherParticipantId).select('username avatar'); 

      return {
        chatId: c.chatId, // Used by frontend navigation to get full conversation
        lastMessage: lastMessage ? {
          sender: lastMessage.sender,
          text: lastMessage.text,
          // IMPORTANT: `media` here is the *server path*, not a full URL.
          // Frontend will convert this to a full URL.
          media: lastMessage.media,
          createdAt: lastMessage.createdAt
        } : null,
        // IMPORTANT: `otherParticipant` structure must match frontend's expectation
        otherParticipant: otherParticipant ? {
            id: otherParticipant._id,
            username: otherParticipant.username,
            avatar: otherParticipant.avatar // Path to avatar, frontend will handle if it's a URL
        } : null,
        participants: c.participants
      };
    }));

    // Filter out chats where the current user is blocked by or has blocked the other participant
    const filteredPreviews = [];
    for (const preview of previews) {
        if (preview.otherParticipant) { 
            const friendshipStatus = await findFriendshipBetweenUsers(req.user.id, preview.otherParticipant.id);
            if (friendshipStatus && friendshipStatus.status === 'blocked') {
                continue;
            }
        }
        filteredPreviews.push(preview);
    }

    res.json(filteredPreviews); // Sends an array of chat preview objects
  } catch (err) {
    console.error(err.message);
    next(err);
  }
});

// Get Full Conversation
// Endpoint: GET /api/chat/conversations/:chatId
router.get('/conversations/:chatId', auth, async (req, res, next) => {
  try {
      const chat = await Chat.findOne({ 
          chatId: req.params.chatId, 
          participants: req.user.id 
      })
      .populate('messages.sender', 'username avatar')
      .populate('participants', 'username avatar');

      if (!chat) {
          return res.status(404).json({ msg: 'Chat not found' });
      }
      
      const otherParticipant = chat.participants.find(p => p._id.toString() !== req.user.id);

      // Check blocking status
      if (otherParticipant) {
          const friendshipStatus = await findFriendshipBetweenUsers(req.user.id, otherParticipant._id);
          if (friendshipStatus && friendshipStatus.status === 'blocked') {
              if (friendshipStatus.requester.toString() === otherParticipant._id.toString() && 
                  friendshipStatus.recipient.toString() === req.user.id) {
                  return res.status(403).json({ msg: 'You are blocked by this user' });
              } else if (friendshipStatus.requester.toString() === req.user.id && 
                  friendshipStatus.recipient.toString() === otherParticipant._id.toString()) {
                  return res.status(403).json({ msg: 'You have blocked this user' });
              }
          }
      }

      res.json(chat);
  } catch (err) {
      console.error(err.message);
      next(err);
  }
});


// --- New Friend System Routes ---
// (These routes are used by ChatFeed or other parts of your app, not directly by ChatScreen)

// @route   POST /api/chat/friends/request
router.post('/friends/request', auth, async (req, res, next) => {
  try {
    const { recipientId } = req.body;
    const requesterId = req.user.id;
    if (requesterId === recipientId) return res.status(400).json({ msg: 'You cannot send a friend request to yourself.' });
    const recipientUser = await User.findById(recipientId);
    if (!recipientUser) return res.status(404).json({ msg: 'Recipient user not found.' });
    const existingFriendship = await findFriendshipBetweenUsers(requesterId, recipientId);
    if (existingFriendship) {
      if (existingFriendship.status === 'pending') {
        if (existingFriendship.recipient.toString() === requesterId) {
            existingFriendship.status = 'accepted';
            await existingFriendship.save();
            return res.status(200).json({ msg: 'Friend request accepted automatically.', friendship: existingFriendship });
        } else {
            return res.status(400).json({ msg: 'Friend request already pending from you to this user.' });
        }
      } else if (existingFriendship.status === 'accepted') { return res.status(400).json({ msg: 'You are already friends with this user.' }); }
      else if (existingFriendship.status === 'blocked') {
        if (existingFriendship.requester.toString() === requesterId) return res.status(400).json({ msg: 'You have blocked this user. Unblock to send a request.' });
        else return res.status(400).json({ msg: 'You are blocked by this user. Cannot send request.' });
      } else if (existingFriendship.status === 'declined') {
        existingFriendship.status = 'pending';
        existingFriendship.requester = requesterId;
        existingFriendship.recipient = recipientId;
        await existingFriendship.save();
        return res.status(200).json({ msg: 'Friend request re-sent successfully.', friendship: existingFriendship });
      }
    }
    const newFriendship = new Friendship({ requester: requesterId, recipient: recipientId, status: 'pending' });
    await newFriendship.save();
    res.status(201).json({ msg: 'Friend request sent successfully.', friendship: newFriendship });
  } catch (err) { console.error(err.message); next(err); }
});

// @route   POST /api/chat/friends/accept/:friendshipId
router.post('/friends/accept/:friendshipId', auth, async (req, res, next) => {
  try {
    const friendshipId = req.params.friendshipId;
    const userId = req.user.id;
    const friendship = await Friendship.findById(friendshipId);
    if (!friendship) return res.status(404).json({ msg: 'Friend request not found.' });
    if (friendship.recipient.toString() !== userId) return res.status(401).json({ msg: 'Not authorized to accept this request.' });
    if (friendship.status !== 'pending') return res.status(400).json({ msg: `Friend request is not pending. Current status: ${friendship.status}` });
    friendship.status = 'accepted';
    await friendship.save();
    res.json({ msg: 'Friend request accepted.', friendship });
  } catch (err) { console.error(err.message); next(err); }
});

// @route   POST /api/chat/friends/decline/:friendshipId
router.post('/friends/decline/:friendshipId', auth, async (req, res, next) => {
  try {
    const friendshipId = req.params.friendshipId;
    const userId = req.user.id;
    const friendship = await Friendship.findById(friendshipId);
    if (!friendship) return res.status(404).json({ msg: 'Friend request not found.' });
    if (friendship.recipient.toString() !== userId) return res.status(401).json({ msg: 'Not authorized to decline this request.' });
    if (friendship.status !== 'pending') return res.status(400).json({ msg: `Friend request is not pending. Current status: ${friendship.status}` });
    friendship.status = 'declined'; 
    await friendship.save();
    res.json({ msg: 'Friend request declined.', friendship });
  } catch (err) { console.error(err.message); next(err); }
});

// @route   DELETE /api/chat/friends/remove/:friendId
router.delete('/friends/remove/:friendId', auth, async (req, res, next) => {
  try {
    const friendId = req.params.friendId;
    const userId = req.user.id;
    const friendship = await findFriendshipBetweenUsers(userId, friendId);
    if (!friendship) return res.status(404).json({ msg: 'Friendship not found.' });
    const isParticipant = friendship.requester.toString() === userId || friendship.recipient.toString() === userId;
    if (!isParticipant || friendship.status !== 'accepted') return res.status(400).json({ msg: 'Cannot remove this user or friendship not established as accepted.' });
    await friendship.deleteOne(); 
    res.json({ msg: 'Friend removed successfully.' });
  } catch (err) { console.error(err.message); next(err); }
});

// @route   POST /api/chat/friends/block/:userIdToBlock
router.post('/friends/block/:userIdToBlock', auth, async (req, res, next) => {
  try {
    const userIdToBlock = req.params.userIdToBlock;
    const userId = req.user.id;
    if (userId === userIdToBlock) return res.status(400).json({ msg: 'You cannot block yourself.' });
    const userToBlock = await User.findById(userIdToBlock);
    if (!userToBlock) return res.status(404).json({ msg: 'User to block not found.' });
    let friendship = await findFriendshipBetweenUsers(userId, userIdToBlock);
    if (friendship) {
      friendship.status = 'blocked';
      await friendship.save();
      return res.json({ msg: 'User blocked successfully.', friendship });
    } else {
      friendship = new Friendship({ requester: userId, recipient: userIdToBlock, status: 'blocked' });
      await friendship.save();
      return res.status(201).json({ msg: 'User blocked successfully.', friendship });
    }
  } catch (err) { console.error(err.message); next(err); }
});

// @route   POST /api/chat/friends/unblock/:userIdToUnblock
router.post('/friends/unblock/:userIdToUnblock', auth, async (req, res, next) => {
  try {
    const userIdToUnblock = req.params.userIdToUnblock;
    const userId = req.user.id;
    const friendship = await findFriendshipBetweenUsers(userId, userIdToUnblock);
    if (!friendship) return res.status(404).json({ msg: 'No block relationship found with this user.' });
    if (friendship.status !== 'blocked') return res.status(400).json({ msg: 'This user is not currently blocked.' });
    await friendship.deleteOne();
    res.json({ msg: 'User unblocked successfully.' });
  } catch (err) { console.error(err.message); next(err); }
});

// @route   GET /api/chat/friends
router.get('/friends', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const friendships = await Friendship.find({ $or: [{ requester: userId }, { recipient: userId }], status: 'accepted' })
      .populate('requester', 'username email avatar') 
      .populate('recipient', 'username email avatar'); 
    const friends = friendships.map(friendship => {
      if (friendship.requester._id.toString() === userId) {
        return { id: friendship.recipient._id, username: friendship.recipient.username, email: friendship.recipient.email, avatar: friendship.recipient.avatar, friendshipId: friendship._id, status: friendship.status };
      } else {
        return { id: friendship.requester._id, username: friendship.requester.username, email: friendship.requester.email, avatar: friendship.requester.avatar, friendshipId: friendship._id, status: friendship.status };
      }
    });
    res.json(friends);
  } catch (err) { console.error(err.message); next(err); }
});

// @route   GET /api/chat/friends/requests/sent
router.get('/friends/requests/sent', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const sentRequests = await Friendship.find({ requester: userId, status: 'pending' })
      .populate('recipient', 'username email avatar'); 
    res.json(sentRequests);
  } catch (err) { console.error(err.message); next(err); }
});

// @route   GET /api/chat/friends/requests/received
router.get('/friends/requests/received', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const receivedRequests = await Friendship.find({ recipient: userId, status: 'pending' })
      .populate('requester', 'username email avatar'); 
    res.json(receivedRequests);
  } catch (err) { console.error(err.message); next(err); }
});

// @route   GET /api/chat/friends/status/:otherUserId
router.get('/friends/status/:otherUserId', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const otherUserId = req.params.otherUserId;
    if (userId === otherUserId) return res.status(200).json({ status: 'self' }); 
    const friendship = await findFriendshipBetweenUsers(userId, otherUserId);
    if (!friendship) return res.status(200).json({ status: 'none' }); 
    let status = friendship.status; 
    if (status === 'pending') {
      if (friendship.requester.toString() === userId) { status = 'pending_sent'; } 
      else { status = 'pending_received'; }
    } else if (status === 'blocked') {
        if (friendship.requester.toString() === userId) { status = 'blocked_by_you'; } 
        else { status = 'blocked_you'; }
    }
    res.json({ status: status, friendshipId: friendship._id });
  } catch (err) { console.error(err.message); next(err); }
});

module.exports = router;