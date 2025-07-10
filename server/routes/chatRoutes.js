const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Assuming your auth middleware is correct
const multer = require('../config/multerConfig'); // Assuming multer configuration is correct
const { nanoid } = require('nanoid');
const Chat = require('../models/Chat');
const User = require('../models/User'); // Make sure your User model is correctly imported and structured
const Friendship = require('../models/Friendship'); // Import the Friendship model

// --- Helper Function ---
// This function finds a friendship between two users, regardless of who is requester/recipient.
const findFriendshipBetweenUsers = async (userId1, userId2) => {
  return await Friendship.findOne({
    $or: [
      { requester: userId1, recipient: userId2 },
      { requester: userId2, recipient: userId1 }
    ]
  });
};

// --- Existing Chat Routes ---

// Send Message
router.post('/send', auth, multer.single('media'), async (req, res, next) => {
  try {
    const { to, message } = req.body;
    
    // Optional: Check if 'to' user is a friend before allowing message (enhancement)
    // For now, it behaves as before, allowing messages if a chat exists or creating one.
    
    let chat = await Chat.findOne({ participants: { $all: [req.user.id, to] } });

    if (!chat) {
      chat = new Chat({ chatId: nanoid(8), participants: [req.user.id, to], messages: [] });
    }
    
    // Check for blocking status before allowing message
    const friendshipStatus = await findFriendshipBetweenUsers(req.user.id, to);
    if (friendshipStatus && friendshipStatus.status === 'blocked') {
        // Determine who blocked whom
        if (friendshipStatus.requester.toString() === to && friendshipStatus.recipient.toString() === req.user.id) {
            return res.status(403).json({ msg: 'You are blocked by this user and cannot send messages.' });
        } else if (friendshipStatus.requester.toString() === req.user.id && friendshipStatus.recipient.toString() === to) {
            return res.status(403).json({ msg: 'You have blocked this user and cannot send messages.' });
        }
    }

    chat.messages.push({ sender: req.user.id, text: message, media: req.file?.path });
    await chat.save();
    res.json(chat);
  } catch (err) {
    console.error(err.message);
    next(err);
  }
});

// List Chat Previews
router.get('/', auth, async (req, res, next) => {
  try {
    const chats = await Chat.find({ participants: req.user.id })
                             .sort({ 'messages.createdAt': -1 }); // Sort by latest message date

    const previews = await Promise.all(chats.map(async c => {
      const lastMessage = c.messages[c.messages.length - 1];
      const otherParticipantId = c.participants.find(p => p.toString() !== req.user.id);
      
      // Populate other participant's details
      const otherParticipant = await User.findById(otherParticipantId).select('username avatar'); // Select specific fields

      return {
        chatId: c.chatId,
        lastMessage: lastMessage ? {
          sender: lastMessage.sender,
          text: lastMessage.text,
          media: lastMessage.media,
          createdAt: lastMessage.createdAt
        } : null,
        otherParticipant: otherParticipant ? {
            id: otherParticipant._id,
            username: otherParticipant.username,
            avatar: otherParticipant.avatar // Assuming avatar field exists on User
        } : null,
        participants: c.participants
      };
    }));

    // Filter out chats where the current user is blocked by or has blocked the other participant
    // This assumes you don't want to show chat previews with blocked users.
    const filteredPreviews = [];
    for (const preview of previews) {
        if (preview.otherParticipant) { // Ensure other participant exists
            const friendshipStatus = await findFriendshipBetweenUsers(req.user.id, preview.otherParticipant.id);
            if (friendshipStatus && friendshipStatus.status === 'blocked') {
                // If the current user blocked the other, or vice-versa, skip this chat preview
                continue;
            }
        }
        filteredPreviews.push(preview);
    }


    res.json(filteredPreviews);
  } catch (err) {
    console.error(err.message);
    next(err);
  }
});

// Get Full Conversation
router.get('/conversations/:chatId', auth, async (req, res, next) => {
  try {
    const chat = await Chat.findOne({ chatId: req.params.chatId, participants: req.user.id })
                          .populate('messages.sender', 'username avatar') // Populate sender details for messages
                          .populate('participants', 'username avatar'); // Populate participant details

    if (!chat) {
      return res.status(404).json({ msg: 'Chat not found or you are not a participant.' });
    }
    
    const otherParticipant = chat.participants.find(p => p._id.toString() !== req.user.id);

    // Check blocking status before revealing full conversation
    if (otherParticipant) {
        const friendshipStatus = await findFriendshipBetweenUsers(req.user.id, otherParticipant._id);
        if (friendshipStatus && friendshipStatus.status === 'blocked') {
            // Determine who blocked whom for a more specific message if needed
            if (friendshipStatus.requester.toString() === otherParticipant._id.toString() && friendshipStatus.recipient.toString() === req.user.id) {
                return res.status(403).json({ msg: 'You are blocked by this user and cannot view this conversation.' });
            } else if (friendshipStatus.requester.toString() === req.user.id && friendshipStatus.recipient.toString() === otherParticipant._id.toString()) {
                return res.status(403).json({ msg: 'You have blocked this user and cannot view this conversation.' });
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

// @route   POST /api/chat/friends/request
// @desc    Send a friend request
// @access  Private
router.post('/friends/request', auth, async (req, res, next) => {
  try {
    const { recipientId } = req.body;
    const requesterId = req.user.id;

    if (requesterId === recipientId) {
      return res.status(400).json({ msg: 'You cannot send a friend request to yourself.' });
    }

    const recipientUser = await User.findById(recipientId);
    if (!recipientUser) {
      return res.status(404).json({ msg: 'Recipient user not found.' });
    }

    const existingFriendship = await findFriendshipBetweenUsers(requesterId, recipientId);

    if (existingFriendship) {
      if (existingFriendship.status === 'pending') {
        // If there's an existing pending request and it's from the recipient to the requester, auto-accept
        if (existingFriendship.recipient.toString() === requesterId) {
            existingFriendship.status = 'accepted';
            await existingFriendship.save();
            return res.status(200).json({ msg: 'Friend request accepted automatically.', friendship: existingFriendship });
        } else {
            return res.status(400).json({ msg: 'Friend request already pending from you to this user.' });
        }
      } else if (existingFriendship.status === 'accepted') {
        return res.status(400).json({ msg: 'You are already friends with this user.' });
      } else if (existingFriendship.status === 'blocked') {
        // Check if the current user is the one who blocked, or is blocked by
        if (existingFriendship.requester.toString() === requesterId) {
          return res.status(400).json({ msg: 'You have blocked this user. Unblock to send a request.' });
        } else {
          return res.status(400).json({ msg: 'You are blocked by this user. Cannot send request.' });
        }
      } else if (existingFriendship.status === 'declined') {
        // If previously declined, allow re-requesting by updating status
        existingFriendship.status = 'pending';
        // Ensure requester and recipient are correctly set for the *new* pending state
        // The requester should be the one sending it *now*
        existingFriendship.requester = requesterId;
        existingFriendship.recipient = recipientId;
        await existingFriendship.save();
        return res.status(200).json({ msg: 'Friend request re-sent successfully.', friendship: existingFriendship });
      }
    }

    const newFriendship = new Friendship({
      requester: requesterId,
      recipient: recipientId,
      status: 'pending'
    });

    await newFriendship.save();
    res.status(201).json({ msg: 'Friend request sent successfully.', friendship: newFriendship });

  } catch (err) {
    console.error(err.message);
    next(err);
  }
});

// @route   POST /api/chat/friends/accept/:friendshipId
// @desc    Accept a friend request
// @access  Private
router.post('/friends/accept/:friendshipId', auth, async (req, res, next) => {
  try {
    const friendshipId = req.params.friendshipId;
    const userId = req.user.id;

    const friendship = await Friendship.findById(friendshipId);

    if (!friendship) {
      return res.status(404).json({ msg: 'Friend request not found.' });
    }

    if (friendship.recipient.toString() !== userId) {
      return res.status(401).json({ msg: 'Not authorized to accept this request.' });
    }

    if (friendship.status !== 'pending') {
      return res.status(400).json({ msg: `Friend request is not pending. Current status: ${friendship.status}` });
    }

    friendship.status = 'accepted';
    await friendship.save();

    res.json({ msg: 'Friend request accepted.', friendship });

  } catch (err) {
    console.error(err.message);
    next(err);
  }
});

// @route   POST /api/chat/friends/decline/:friendshipId
// @desc    Decline a friend request
// @access  Private
router.post('/friends/decline/:friendshipId', auth, async (req, res, next) => {
  try {
    const friendshipId = req.params.friendshipId;
    const userId = req.user.id;

    const friendship = await Friendship.findById(friendshipId);

    if (!friendship) {
      return res.status(404).json({ msg: 'Friend request not found.' });
    }

    if (friendship.recipient.toString() !== userId) {
      return res.status(401).json({ msg: 'Not authorized to decline this request.' });
    }

    if (friendship.status !== 'pending') {
      return res.status(400).json({ msg: `Friend request is not pending. Current status: ${friendship.status}` });
    }

    friendship.status = 'declined'; // Set to declined
    await friendship.save();
    // Alternatively, to completely remove the request: await friendship.deleteOne();

    res.json({ msg: 'Friend request declined.', friendship });

  } catch (err) {
    console.error(err.message);
    next(err);
  }
});

// @route   DELETE /api/chat/friends/remove/:friendId
// @desc    Remove an accepted friend
// @access  Private
router.delete('/friends/remove/:friendId', auth, async (req, res, next) => {
  try {
    const friendId = req.params.friendId;
    const userId = req.user.id;

    const friendship = await findFriendshipBetweenUsers(userId, friendId);

    if (!friendship) {
      return res.status(404).json({ msg: 'Friendship not found.' });
    }

    // Ensure one of the participants is the current user and status is accepted
    const isParticipant = friendship.requester.toString() === userId || friendship.recipient.toString() === userId;
    if (!isParticipant || friendship.status !== 'accepted') {
      return res.status(400).json({ msg: 'Cannot remove this user or friendship not established as accepted.' });
    }

    await friendship.deleteOne(); // Delete the friendship record

    res.json({ msg: 'Friend removed successfully.' });

  } catch (err) {
    console.error(err.message);
    next(err);
  }
});

// @route   POST /api/chat/friends/block/:userIdToBlock
// @desc    Block a user
// @access  Private
router.post('/friends/block/:userIdToBlock', auth, async (req, res, next) => {
  try {
    const userIdToBlock = req.params.userIdToBlock;
    const userId = req.user.id;

    if (userId === userIdToBlock) {
      return res.status(400).json({ msg: 'You cannot block yourself.' });
    }

    const userToBlock = await User.findById(userIdToBlock);
    if (!userToBlock) {
      return res.status(404).json({ msg: 'User to block not found.' });
    }

    let friendship = await findFriendshipBetweenUsers(userId, userIdToBlock);

    if (friendship) {
      // If a friendship exists, update its status to 'blocked'
      friendship.status = 'blocked';
      // If the current user is the one who initiated the block, ensure they are the requester
      // of this specific block relationship for clarity, though the unique index covers the pair.
      // This might be redundant due to the unique index that considers both directions.
      if (friendship.requester.toString() !== userId) {
        // If the roles are swapped from the perspective of the current blocker,
        // it's cleaner to re-assign or delete and recreate, but updating status is sufficient.
        // For 'blocked', it often implies that one person is explicitly initiating the block.
        // We'll leave it as is and let the 'status' change handle it,
        // as the `findFriendshipBetweenUsers` correctly finds the existing link.
      }
      await friendship.save();
      return res.json({ msg: 'User blocked successfully.', friendship });
    } else {
      // If no friendship exists, create a new one with status 'blocked'
      friendship = new Friendship({
        requester: userId, // The blocker is the requester in this new record
        recipient: userIdToBlock,
        status: 'blocked'
      });
      await friendship.save();
      return res.status(201).json({ msg: 'User blocked successfully.', friendship });
    }

  } catch (err) {
    console.error(err.message);
    next(err);
  }
});

// @route   POST /api/chat/friends/unblock/:userIdToUnblock
// @desc    Unblock a user
// @access  Private
router.post('/friends/unblock/:userIdToUnblock', auth, async (req, res, next) => {
  try {
    const userIdToUnblock = req.params.userIdToUnblock;
    const userId = req.user.id;

    const friendship = await findFriendshipBetweenUsers(userId, userIdToUnblock);

    if (!friendship) {
      return res.status(404).json({ msg: 'No block relationship found with this user.' });
    }

    // Ensure the current user is involved in the 'blocked' status, and they are the one who initiated the block
    // or are the recipient of a block that is now being lifted (less common).
    // The main use case is that the current user (requester or recipient) is lifting a block *they* initiated or were involved in.
    if (friendship.status !== 'blocked') {
      return res.status(400).json({ msg: 'This user is not currently blocked.' });
    }

    // To unblock, we usually remove the 'blocked' record.
    // If you want to change it back to 'none' or 'accepted' based on prior state,
    // you'd need more complex logic (e.g., store previous status).
    await friendship.deleteOne();

    res.json({ msg: 'User unblocked successfully.' });

  } catch (err) {
    console.error(err.message);
    next(err);
  }
});


// @route   GET /api/chat/friends
// @desc    Get all accepted friends for the authenticated user
// @access  Private
router.get('/friends', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const friendships = await Friendship.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: 'accepted'
    }).populate('requester', 'username email avatar') // Populate user details
      .populate('recipient', 'username email avatar'); // Populate user details

    const friends = friendships.map(friendship => {
      // Return the details of the 'other' user in the friendship
      if (friendship.requester._id.toString() === userId) {
        return {
          id: friendship.recipient._id,
          username: friendship.recipient.username,
          email: friendship.recipient.email,
          avatar: friendship.recipient.avatar,
          friendshipId: friendship._id,
          status: friendship.status // Should always be 'accepted' here
        };
      } else {
        return {
          id: friendship.requester._id,
          username: friendship.requester.username,
          email: friendship.requester.email,
          avatar: friendship.requester.avatar,
          friendshipId: friendship._id,
          status: friendship.status // Should always be 'accepted' here
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
// @desc    Get all outgoing pending friend requests from the authenticated user
// @access  Private
router.get('/friends/requests/sent', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const sentRequests = await Friendship.find({
      requester: userId,
      status: 'pending'
    }).populate('recipient', 'username email avatar'); // Populate recipient details

    res.json(sentRequests);

  } catch (err) {
    console.error(err.message);
    next(err);
  }
});

// @route   GET /api/chat/friends/requests/received
// @desc    Get all incoming pending friend requests for the authenticated user
// @access  Private
router.get('/friends/requests/received', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const receivedRequests = await Friendship.find({
      recipient: userId,
      status: 'pending'
    }).populate('requester', 'username email avatar'); // Populate requester details

    res.json(receivedRequests);

  } catch (err) {
    console.error(err.message);
    next(err);
  }
});

// @route   GET /api/chat/friends/status/:otherUserId
// @desc    Get friendship status with another user
// @access  Private
router.get('/friends/status/:otherUserId', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const otherUserId = req.params.otherUserId;

    if (userId === otherUserId) {
      return res.status(200).json({ status: 'self' }); // Indicating it's the same user
    }

    const friendship = await findFriendshipBetweenUsers(userId, otherUserId);

    if (!friendship) {
      return res.status(200).json({ status: 'none' }); // No existing friendship/relationship record
    }

    let status = friendship.status; // Base status from DB

    // Refine 'pending' and 'blocked' statuses for client-side context
    if (status === 'pending') {
      if (friendship.requester.toString() === userId) {
        status = 'pending_sent'; // Current user sent the request
      } else {
        status = 'pending_received'; // Current user received the request
      }
    } else if (status === 'blocked') {
        if (friendship.requester.toString() === userId) {
            status = 'blocked_by_you'; // Current user initiated the block
        } else {
            status = 'blocked_you'; // Current user is blocked by the other user
        }
    }

    res.json({ status: status, friendshipId: friendship._id });

  } catch (err) {
    console.error(err.message);
    next(err);
  }
});


module.exports = router;