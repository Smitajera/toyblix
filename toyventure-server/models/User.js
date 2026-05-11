const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [false, 'Name is optional initially'],
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
  },
  mobileNumber: {
    type: String,
    unique: true,
    sparse: true,
    match: [/^[0-9]{10,15}$/, 'Please use a valid mobile number'],
  },
  password: {
    type: String,
    select: false, 
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  addresses: [{
    flatNumber: String,
    street: String,
    landmark: String,
    city: String,
    pincode: String,
    isDefault: { type: Boolean, default: false }
  }],
  
  // NEW: Cloud Sync Arrays for Persistent Storage
  cart: { type: Array, default: [] },
  cartUpdatedAt: { type: Date },
  wishlist: { type: Array, default: [] },
  isBanned: { type: Boolean, default: false },
  
  // Loyalty Points
  points: { type: Number, default: 0 }
  
}, {
  timestamps: true,
});

// FIX 1: Removed 'next' callback. Throw an error synchronously instead.
userSchema.pre('validate', function () {
  if (!this.email && !this.mobileNumber) {
    throw new Error('Either email or mobile number is required');
  }
});

// FIX 2: Removed 'next' callback from the async function. 
// Mongoose automatically waits for async functions to finish.
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) {
    return; // Just return to exit early
  } 
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;