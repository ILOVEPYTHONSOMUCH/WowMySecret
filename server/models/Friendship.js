const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FriendshipSchema = new Schema({
  // The user who initiated the friend request
  requester: {
    type: Schema.Types.ObjectId,
    ref: 'User', // References the User model
    required: true
  },
  // The user who received the friend request
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User', // References the User model
    required: true
  },
  // Status of the friendship:
  // 'pending': Request sent, awaiting recipient's response
  // 'accepted': Friendship established
  // 'declined': Recipient declined the request
  // 'blocked': One user has blocked the other
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'blocked'],
    default: 'pending',
    required: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields automatically
});

// Add a unique compound index to prevent duplicate friendships
// Ensures that a friendship between two users can only exist once,
// regardless of who initiated it (by sorting requester/recipient IDs).
FriendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });
FriendshipSchema.index({ recipient: 1, requester: 1 }, { unique: true }); // For reverse order

module.exports = mongoose.models.Friendship || mongoose.model('Friendship', FriendshipSchema);