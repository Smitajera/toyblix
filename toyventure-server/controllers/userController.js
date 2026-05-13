const User = require('../models/User');
const OtpChallenge = require('../models/OtpChallenge');
const sendEmail = require('../utils/sendEmail');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                mobileNumber: user.mobileNumber,
                role: user.role,
                addresses: user.addresses,
                cart: user.cart,
                wishlist: user.wishlist,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            
            if (req.body.addresses) {
                if (req.body.addresses.length > 3) {
                    return res.status(400).json({ message: 'Maximum of 3 addresses allowed.' });
                }
                user.addresses = req.body.addresses;
            }

            if (req.body.cart !== undefined) {
                user.cart = req.body.cart;
                user.cartUpdatedAt = new Date(); // Track when cart was last modified
            }
            if (req.body.wishlist !== undefined) user.wishlist = req.body.wishlist;

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                mobileNumber: updatedUser.mobileNumber,
                role: updatedUser.role,
                addresses: updatedUser.addresses,
                cart: updatedUser.cart,
                wishlist: updatedUser.wishlist,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error updating profile' });
    }
};

// @desc    Get all users (with order stats)
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
    try {
        const users = await User.aggregate([
            {
                $lookup: {
                    from: 'orders',
                    localField: '_id',
                    foreignField: 'user',
                    as: 'orders'
                }
            },
            {
                $addFields: {
                    orderCount: { $size: "$orders" },
                    totalSpend: { 
                        $reduce: { 
                            input: "$orders", 
                            initialValue: 0, 
                            in: { 
                                $add: [
                                    "$$value", 
                                    { $cond: [
                                        { $or: [
                                            { $eq: ["$$this.paymentStatus", "paid"] },
                                            { $eq: ["$$this.paymentMethod", "cod"] }
                                        ]}, 
                                        "$$this.totalPrice", 
                                        0
                                    ]}
                                ] 
                            }
                        } 
                    }
                }
            },
            {
                $project: {
                    password: 0,
                    cart: 0,
                    wishlist: 0,
                    orders: 0
                }
            },
            { $sort: { createdAt: -1 } }
        ]);
        res.json(users);
    } catch (error) {
        console.error('Fetch All Users Error:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
};

// @desc    Toggle User Ban Status
// @route   PUT /api/users/:id/ban
// @access  Private/Admin
const toggleUserBanStatus = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            if (user._id.toString() === req.user._id.toString()) {
                return res.status(400).json({ message: 'You cannot ban yourself.' });
            }
            user.isBanned = !user.isBanned;
            await user.save();
            res.json({ message: `User ${user.isBanned ? 'banned' : 'unbanned'} successfully.` });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error updating user ban status' });
    }
};

// @desc    Update User Role
// @route   PUT /api/users/:id/role
// @access  Private/Admin
const updateUserRole = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            if (user._id.toString() === req.user._id.toString()) {
                return res.status(400).json({ message: 'You cannot change your own role.' });
            }
            user.role = user.role === 'admin' ? 'user' : 'admin';
            await user.save();
            res.json({ message: `User promoted to ${user.role}.` });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error updating user role' });
    }
};

// @desc    Request OTP to promote/add a new admin
// @route   POST /api/users/admin/request-promotion
// @access  Private/Admin
const requestAdminPromotion = async (req, res, next) => {
  try {
    const admin = req.user;
    const adminIdentifier = admin.email || admin.mobileNumber;

    if (!adminIdentifier) {
      return res.status(400).json({ message: 'Your admin account lacks an email or mobile number for verification.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000); 
    const channel = admin.email ? 'email' : 'mobile';

    await OtpChallenge.findOneAndUpdate(
      { identifierKey: adminIdentifier },
      {
        identifierKey: adminIdentifier,
        channel,
        otpHash: otp,
        expiresAt,
        isUsed: false,
        attempts: 0
      },
      { upsert: true, new: true }
    );

    if (channel === 'email') {
      await sendEmail({
        email: admin.email,
        subject: 'Security Alert: Admin Promotion Verification',
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2 style="color: #dc2626;">Admin Security Verification</h2>
            <p>You have initiated a request to add or promote a user to an Admin role.</p>
            <p>To confirm this is you, please enter the following OTP:</p>
            <h2>${otp}</h2>
          </div>
        `
      });
      console.log(`📧 Admin security OTP sent to: ${admin.email}`);
    } else {
      console.log(`\n=== 🛡️ ADMIN SECURITY OTP (SMS MOCK) ===`);
      console.log(`To Admin: ${adminIdentifier}`);
      console.log(`OTP: ${otp}`);
      console.log(`==========================================\n`);
    }

    res.status(200).json({ message: 'Security OTP sent to your registered admin contact.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP and promote/add the new admin
// @route   POST /api/users/admin/confirm-promotion
// @access  Private/Admin
const confirmAdminPromotion = async (req, res, next) => {
  try {
    const admin = req.user;
    const adminIdentifier = admin.email || admin.mobileNumber;
    const { targetEmail, targetMobile, otp } = req.body;

    if (!otp) return res.status(400).json({ message: 'Admin verification OTP is required.' });
    if (!targetEmail && !targetMobile) return res.status(400).json({ message: 'Target user email or mobile is required.' });

    const challenge = await OtpChallenge.findOne({ identifierKey: adminIdentifier });
    if (!challenge || challenge.otpHash !== String(otp).trim() || challenge.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Invalid or expired Admin Security OTP.' });
    }

    await OtpChallenge.deleteOne({ _id: challenge._id });

    const targetIdentifier = targetEmail || targetMobile;
    let targetUser = await User.findOne({
      $or: [{ email: targetIdentifier }, { mobileNumber: targetIdentifier }]
    });

    if (targetUser) {
      targetUser.role = 'admin';
      await targetUser.save();
    } else {
      targetUser = await User.create({
        email: targetEmail || undefined,
        mobileNumber: targetMobile || undefined,
        role: 'admin'
      });
    }

    res.status(200).json({ 
      message: 'User successfully promoted to Admin.',
      user: { _id: targetUser._id, role: targetUser.role, email: targetUser.email } 
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { 
    getUserProfile, 
    updateUserProfile, 
    getAllUsers, 
    toggleUserBanStatus, 
    updateUserRole,
    requestAdminPromotion,
    confirmAdminPromotion
};