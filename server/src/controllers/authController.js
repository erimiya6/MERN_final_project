const crypto = require('crypto');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { logAudit } = require('../services/auditService');

// Helper to set HTTP-only cookie and return JSON response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();
  const cookieDays = parseInt(process.env.COOKIE_EXPIRES_DAYS, 10) || 7;

  const cookieOptions = {
    expires: new Date(Date.now() + cookieDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  };

  // Safe user representation (omit password)
  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    studentId: user.studentId,
    phone: user.phone,
    avatar: user.avatar,
    contactPreference: user.contactPreference,
    status: user.status,
    createdAt: user.createdAt,
  };

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      token, // Also provided for optional header-based API clients
      user: userData,
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone, contactPreference } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    // Institutional email validation: must be <username>.<studentId>@sst.scaler.com
    // e.g. student.2xbcsxxxxx@sst.scaler.com
    const allowedDomain = process.env.COLLEGE_EMAIL_DOMAIN || 'sst.scaler.com';
    const escapedDomain = allowedDomain.split('.').join('\\.');
    const institutionalEmailRegex = new RegExp(
      `^[a-zA-Z0-9]+\\.[a-zA-Z0-9]+@${escapedDomain}$`,
      'i'
    );
    if (!institutionalEmailRegex.test(email.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Only official institutional emails in the format <username>.<studentId>@${allowedDomain} are permitted. Example: student.2xbcsxxxxx@${allowedDomain}`,
      });
    }

    // studentId is derived automatically from the email via a virtual — no separate input needed

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // Public registration strictly assigns 'user' role.
    // Administrator accounts must be created deliberately via CLI script or admin promotion.
    const role = 'user';

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone: phone || '',
      contactPreference: contactPreference || 'in_app',
      role,
    });

    await logAudit({
      actor: user._id,
      action: 'USER_REGISTER',
      targetModel: 'User',
      targetId: user._id,
      req,
      metadata: { email: user.email, role: user.role },
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Log in user & get cookie
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your email and password.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your email and password.',
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account is currently suspended. Please contact administrator.',
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Log out current user & clear cookie
// @route   POST /api/auth/logout
// @access  Public
exports.logout = (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, contactPreference, avatar } = req.body;

    const fieldsToUpdate = {};
    if (name) fieldsToUpdate.name = name;
    if (phone !== undefined) fieldsToUpdate.phone = phone;
    if (contactPreference) fieldsToUpdate.contactPreference = contactPreference;
    if (avatar !== undefined) fieldsToUpdate.avatar = avatar;

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot Password - Send reset token
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your account email',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't leak user existence for security; return friendly generic message
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been dispatched.',
      });
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    const message = `Hello ${user.name},\n\nYou requested a password reset for your SST Lost & Found account.\nPlease click the link below or paste it into your browser to choose a new password:\n\n${resetUrl}\n\nThis link is valid for 30 minutes. If you did not request this, please ignore this email.`;

    await sendEmail({
      to: user.email,
      subject: 'SST Lost & Found - Password Reset Request',
      text: message,
      html: `<p>Hello <strong>${user.name}</strong>,</p><p>You requested a password reset for your SST Lost & Found account.</p><p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a></p><p>Or copy this link: <br/>${resetUrl}</p><p>This link is valid for 30 minutes.</p>`,
    });

    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been dispatched.',
      resetTokenPreview: process.env.NODE_ENV === 'development' ? resetToken : undefined,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password with token
// @route   PUT /api/auth/reset-password/:resetToken
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a new password of at least 6 characters.',
      });
    }

    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resetToken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token.',
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    await logAudit({
      actor: user._id,
      action: 'PASSWORD_RESET',
      targetModel: 'User',
      targetId: user._id,
      req,
    });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};
