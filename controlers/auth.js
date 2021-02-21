const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

// @desc   register user
// @route  GET /api/v1/auth/regester
// @access public
exports.register = asyncHandler( async(req, res, next) => {
    const { name, email, password, role } = req.body;
    const user = await User.create({
        name,
        email,
        password,
        role
    });

    sendTokenResponse(user, 200, res);
});

// @desc   login user
// @route  GET /api/v1/auth/login
// @access public
exports.login = asyncHandler( async(req, res, next) => {
    const { email, password } = req.body;
    
    // validate email & password
    if(!email || !password) {
        return next(new ErrorResponse('please provide an email and password', 400));
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if(!user) {
        return next(new ErrorResponse('invalid credentials', 401));
    }

    // check if password match
    const isMatch = await user.matchPassword(password);

    if(!isMatch){
        return next(new ErrorResponse('invalid credentials', 401));
    }

    sendTokenResponse(user, 200, res);
});

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
    // Create token
    const token = user.getSignedJwtToken();

    const options = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
        httpOnly: true
    };

    if(process.env.NODE_ENV === 'production') {
        options.secure = true;
    }

    res
        .status(statusCode)
        .cookie('token', token, options)
        .json({
            success: true,
            token
        });
};

// @desc   get current logged in user 
// @route  GET /api/v1/auth/me
// @access private
exports.getMe = asyncHandler( async(req, res, next) => {
    res.status(200).json({
        success: true,
        data: req.user
    });
});

// @desc   Forgot password
// @route  POST /api/v1/auth/forgotpassword
// @access public
exports.forgotPassword = asyncHandler( async(req, res, next) => {
    const user = await User.findOne({ email: req.body.email });

    if(!user) {
        return next(new ErrorResponse('There is no user with this email', 404));
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // create reset url
    const resetUrl = `${req.protocol}://${req.get('host')}/api/vi/auth/resetpassword/${resetToken}`;

    const message = `You are receving this email because you (or someone else) has requested the reset of a password. please make a PUT request to: \n\n ${resetUrl}`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'password reset token',
            message
        });

        res.status(200).json({
            success: true,
            data: 'Email sent'
        });
    } catch (err) {
        console.log(err);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save({ validateBeforeSave: false });

        return next(new ErrorResponse('Email could not be sent', 500));
    }

    console.log(resetToken);
    
    res.status(200).json({
        success: true,
        data: user
    });
});

// @desc   Reset password 
// @route  PUT /api/v1/auth/resetpassword/:resettoken
// @access public
exports.resetPassword = asyncHandler( async(req, res, next) => {
    // Get hashed token
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    });

    if(!user) {
        return next(new ErrorResponse('invalid token', 400));
    }

    // set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();


    sendTokenResponse(user, 200, res);
});

// @desc   update user details 
// @route  PUT /api/v1/auth/updatedetails
// @access private
exports.updateDetails = asyncHandler( async(req, res, next) => {
    const fieldsToUpdate = {
        name: req.body.name,
        email: req.body.email
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, { new: true, runValidators: true });


    res.status(200).json({
        success: true,
        data: user
    });
});

// @desc   update password 
// @route  PUT /api/v1/auth/updatepassword
// @access private
exports.updatePassword = asyncHandler( async(req, res, next) => {
    const user = await User.findById(req.user.id).select('+password');

    // check current password
    if(!(await user.matchPassword(req.body.currentPassword))) {
        return next(new ErrorResponse('password is incorrect', 401));
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
});

// @desc   logout user / clear cookie 
// @route  GET /api/v1/auth/logout
// @access private
exports.logout = asyncHandler( async(req, res, next) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });

    res.status(200).json({
        success: true,
        data: {}
    });
});