const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OtpChallenge = require('../models/OtpChallenge');
const sendEmail = require('../utils/sendEmail');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// @desc    Register a new user (Email/Password)
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, mobileNumber, password } = req.body;

    if (!email && !mobileNumber) {
      return res.status(400).json({ message: 'Please provide an email or mobile number' });
    }

    const query = [];
    if (email) query.push({ email });
    if (mobileNumber) query.push({ mobileNumber });

    const userExists = await User.findOne({ $or: query });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      mobileNumber,
      password,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      return res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    next(error); // Genuine errors will still go to your error handler
  }
};

// @desc    Auth user & get token (Email/Password)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Please provide identifier and password' });
    }

    const user = await User.findOne({
      $or: [{ email: identifier }, { mobileNumber: identifier }],
    }).select('+password');

    if (user && user.isBanned) {
      return res.status(403).json({ message: 'Your account has been banned. Please contact support.' });
    }

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Initiate OTP login/registration
// @route   POST /api/auth/send-otp
// @access  Public
const sendOtp = async (req, res, next) => {
  try {
    const { email, mobileNumber } = req.body;

    if (!email && !mobileNumber) {
      return res.status(400).json({ message: 'Email or mobile number required for OTP' });
    }

    const identifierKey = email || mobileNumber;
    const channel = email ? 'email' : 'mobile';
    const otp = generateOtp();

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    const resendAvailableAt = new Date();
    resendAvailableAt.setMinutes(resendAvailableAt.getMinutes() + 1);

    const maskedRecipient = email
      ? email.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => gp2 + '*'.repeat(gp3.length))
      : mobileNumber.replace(/.(?=.{4})/g, '*');

    const otpHash = otp;

    await OtpChallenge.findOneAndUpdate(
      { identifierKey },
      {
        identifierKey,
        channel,
        otpHash,
        expiresAt,
        resendAvailableAt,
        maskedRecipient,
        isUsed: false,
        attempts: 0,
      },
      { upsert: true, new: true }
    );

    if (channel === 'email') {
      try {
        await sendEmail({
          email: identifierKey,
          subject: 'Your ToyBlix Verification Code',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>ToyBlix Verification</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f7f6; color: #333333;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f7f6; padding: 40px 20px;">
                <tr>
                  <td align="center">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); overflow: hidden;">
                      
                      <tr>
                        <td align="center" style="background-color: #ff6600; padding: 35px 20px;">
                          <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold; letter-spacing: 1.5px;">ToyBlix</h1>
                        </td>
                      </tr>
                      
                      <tr>
                        <td style="padding: 40px 30px; text-align: center;">
                          <h2 style="margin-top: 0; color: #2d3748; font-size: 24px;">Verification Code</h2>
                          <p style="color: #718096; font-size: 16px; line-height: 1.6; margin-bottom: 35px;">
                            Here is your One-Time Password (OTP) to securely access your account. Please do not share this code with anyone.
                          </p>
                          
                          <div style="background-color: #fff5eb; border: 2px dashed #ff6600; padding: 25px; border-radius: 8px; display: inline-block; margin-bottom: 35px;">
                            <strong style="font-size: 42px; letter-spacing: 10px; color: #ff6600; margin-left: 10px;">${otp}</strong>
                          </div>
                          
                          <p style="color: #a0aec0; font-size: 14px; margin-bottom: 0;">
                            This code expires in <strong style="color: #ff6600;">10 minutes</strong>.
                          </p>
                        </td>
                      </tr>
                      
                      <tr>
                        <td style="background-color: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
                          <p style="color: #a0aec0; font-size: 13px; margin: 0; line-height: 1.5;">
                            &copy; 2026 ToyBlix. All rights reserved.<br>
                            <a href="https://toyblix.com" style="color: #ff6600; text-decoration: none; font-weight: bold;">www.toyblix.com</a>
                          </p>
                        </td>
                      </tr>
                      
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `,
        });
        console.log(`📧 OTP Email successfully sent to: ${identifierKey}`);
      } catch (emailError) {
        console.error('Failed to send OTP email:', emailError);
        return res.status(500).json({ message: 'Failed to send OTP email. Please check your email configuration.' });
      }
    } else {
      // Terminal simulation (kept for debugging)
      console.log(`\n========================================`);
      console.log(`📱 WHATSAPP OTP`);
      console.log(`To: ${identifierKey}`);
      console.log(`OTP: ${otp}`);
      console.log(`========================================\n`);

      // WhatsApp Cloud API Integration
      try {
        const wpToken = process.env.WHATSAPP_TOKEN;
        const wpPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_WABA_ID;

        if (wpToken && wpPhoneId) {
          // Format mobile number: Ensure it starts with country code, default to 91 if 10 digits
          let formattedNumber = identifierKey.replace(/\D/g, '');
          if (formattedNumber.length === 10) {
            formattedNumber = '91' + formattedNumber;
          }

          const response = await fetch(`https://graph.facebook.com/v22.0/${wpPhoneId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${wpToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: formattedNumber,
              type: 'template',
              template: {
                name: 'toyblix_otp',
                language: {
                  code: 'en'
                },
                components: [
                  {
                    type: 'body',
                    parameters: [
                      {
                        type: 'text',
                        text: otp
                      }
                    ]
                  },
                  {
                    type: 'button',
                    sub_type: 'url',
                    index: '0',
                    parameters: [
                      {
                        type: 'text',
                        text: otp
                      }
                    ]
                  }
                ]
              }
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            console.error('WhatsApp API Error:', data);
          } else {
            console.log('WhatsApp message successfully sent! Message IDs:', data.messages?.map(m => m.id).join(', '));
          }
        } else {
          console.log('⚠️ WhatsApp credentials missing in .env, skipping API call.');
        }
      } catch (wpError) {
        console.error('Failed to send WhatsApp message:', wpError);
      }
    }

    res.status(200).json({
      message: channel === 'email' ? 'OTP sent to your email' : 'OTP sent successfully',
      expiresIn: 600,
      channel,
      env: process.env.NODE_ENV,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP and issue token
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res, next) => {
  try {
    const { email, mobileNumber, otp } = req.body;

    if (!otp) {
      return res.status(400).json({ message: 'OTP is required' });
    }

    const identifierKeyRaw = email || mobileNumber;

    if (!identifierKeyRaw) {
      return res.status(400).json({ message: 'Email or mobile number is required' });
    }

    const identifierKey = String(identifierKeyRaw).trim();
    const incomingOtp = String(otp).trim();

    const challenge = await OtpChallenge.findOne({ identifierKey });

    console.log(`\n--- OTP Verification Check ---`);
    console.log(`Looking for user: "${identifierKey}"`);
    if (!challenge) {
      console.log(`❌ Challenge not found in DB`);
    } else {
      console.log(`DB OTP: "${challenge.otpHash}"`);
      console.log(`Req OTP: "${incomingOtp}"`);
      console.log(`Expired?: ${challenge.expiresAt < new Date()}`);
    }
    console.log(`------------------------------\n`);

    // FIX: Using res.status().json() instead of throwing next(new Error())
    if (!challenge || challenge.otpHash !== incomingOtp || challenge.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }

    await OtpChallenge.deleteOne({ _id: challenge._id });

    let user = await User.findOne({
      $or: [{ email: identifierKey }, { mobileNumber: identifierKey }],
    });

    if (user && user.isBanned) {
      return res.status(403).json({ message: 'Your account has been banned. Please contact support.' });
    }

    if (!user) {
      user = await User.create({
        email: email || undefined,
        mobileNumber: mobileNumber || undefined,
        role: 'user',
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      mobileNumber: user.mobileNumber,
      role: user.role,
      token: generateToken(user._id),
      isNewUser: !user.name,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  sendOtp,
  verifyOtp,
};