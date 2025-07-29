
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FriendshipSchema = new Schema({
  requester: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'blocked'],
    default: 'pending',
    required: true
  }
}, {
  timestamps: true
});

// Create new compound index
FriendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// Add validation to prevent self-friendship
FriendshipSchema.pre('save', function(next) {
  if (this.requester.equals(this.recipient)) {
    const error = new Error('Users cannot be friends with themselves');
    return next(error);
  }
  next();
});

module.exports = mongoose.models.Friendship || mongoose.model('Friendship', FriendshipSchema);
