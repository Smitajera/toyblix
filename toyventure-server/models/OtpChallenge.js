const mongoose = require('mongoose');

const otpChallengeSchema = new mongoose.Schema(
  {
    identifierKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ['mobile', 'email'],
      required: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    resendAvailableAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
      min: 1,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    lastRequestIp: {
      type: String,
      default: null,
    },
    maskedRecipient: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      default: 'mock',
    },
  },
  { timestamps: true }
);

otpChallengeSchema.index({ identifierKey: 1, isUsed: 1, expiresAt: -1 });

module.exports = mongoose.model('OtpChallenge', otpChallengeSchema);
