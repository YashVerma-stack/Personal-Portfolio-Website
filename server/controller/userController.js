import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from '../middlewares/error.js';
import { User } from "../models/userSchema.js";
import { v2 as cloudinary } from "cloudinary";
import { generateToken } from "../utils/jwtToken.js";
import { sendEmail } from "../utils/sendEmail.js";
import crypto from "crypto"
import dotenv from "dotenv";

dotenv.config({ path: "./config/config.env" });

export const register = catchAsyncErrors(async (req, res, next) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return next(new ErrorHandler("Avatar and resume are required", 400));
    }
    const { avatar } = req.files;

    const cloudinaryResponseForAvatar = await cloudinary.uploader.upload(
        avatar.tempFilePath,
        { folder: "AVATARS" }
    );
    if (!cloudinaryResponseForAvatar || cloudinaryResponseForAvatar.error) {
        console.error(
            "Cloudinary Error:",
            cloudinaryResponseForAvatar.error || "Unknown Cloudinary Error"
        );
    }

    const { resume } = req.files;
    const cloudinaryResponseForResume = await cloudinary.uploader.upload(
        resume.tempFilePath,
        { folder: "MY_RESUME" }
    );
    if (!cloudinaryResponseForResume || cloudinaryResponseForResume.error) {
        console.error(
            "Cloudinary Error:",
            cloudinaryResponseForResume.error || "Unknown Cloudinary Error"
        );
        return next(new ErrorHandler("Failed to upload resume to Cloudinary", 500));
    }

    const {
        fullName,
        email,
        phone,
        aboutMe,
        password,
        portfolioURL,
        gitHubURL,
        linkedInURL,
    } = req.body;

    const user = await User.create({
        fullName,
        email,
        phone,
        aboutMe,
        password,
        portfolioURL,
        gitHubURL,
        linkedInURL,
        avatar: {
            public_id: cloudinaryResponseForAvatar.public_id,
            url: cloudinaryResponseForAvatar.secure_url,
        },
        resume: {
            public_id: cloudinaryResponseForResume.public_id,
            url: cloudinaryResponseForResume.secure_url,
        },
    });
    generateToken(user, "User Registered!", 201, res);
});

export const login = catchAsyncErrors(async (req, res, next) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
        return next(new ErrorHandler("Email and Password are required!", 400));
    }
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
        return next(new ErrorHandler("Invalid Email or Password.", 401));
    }

    const isPasswordMatched = await user.comparePassword(password);
    if (!isPasswordMatched) {
        return next(new ErrorHandler("Invalid Email or Password.", 401));
    }
    generateToken(user, "Logged In", 200, res);
})

export const logout = catchAsyncErrors(async (req, res, next) => {
    res.status(200).cookie("token", "", {
        expires: new Date(Date.now()),
        httpOnly: true,
    }).json({
        success: true,
        message: "Logged Out",
    })
});

export const getUser = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    res.status(200).json({
        success: true,
        user,
    });
});


export const updateProfile = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        return next(new ErrorHandler("User not found!", 404));
    }


    const body = req.body || {};

    const newUserdata = {};

    if (body.fullName !== undefined) newUserdata.fullName = body.fullName;
    if (body.email !== undefined) newUserdata.email = body.email;
    if (body.phone !== undefined) newUserdata.phone = body.phone;
    if (body.aboutMe !== undefined) newUserdata.aboutMe = body.aboutMe;
    if (body.portfolioURL !== undefined) newUserdata.portfolioURL = body.portfolioURL;
    if (body.gitHubURL !== undefined) newUserdata.gitHubURL = body.gitHubURL;
    if (body.linkedInURL !== undefined) newUserdata.linkedInURL = body.linkedInURL;


    // Update avatar if a new one is provided
    if (req.files?.avatar) {
        const avatar = req.files.avatar;

        const cloudinaryResponse = await cloudinary.uploader.upload(
            avatar.tempFilePath,
            { folder: "AVATARS" }
        );

        newUserdata.avatar = {
            public_id: cloudinaryResponse.public_id,
            url: cloudinaryResponse.secure_url,
        };
    }

    // Update resume if a new one is provided
    if (req.files?.resume) {
        const resume = req.files.resume;

        const cloudinaryResponse = await cloudinary.uploader.upload(
            resume.tempFilePath,
            {
                folder: "MY_RESUME",
                resource_type: "raw",
            }
        );

        newUserdata.resume = {
            public_id: cloudinaryResponse.public_id,
            url: cloudinaryResponse.secure_url,
        };
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        { $set: newUserdata },
        {
            new: true,
            runValidators: true,
        }
    );

    // Delete old files only after the database update succeeds
    if (newUserdata.avatar && user.avatar?.public_id) {
        await cloudinary.uploader.destroy(user.avatar.public_id);
    }

    if (newUserdata.resume && user.resume?.public_id) {
        await cloudinary.uploader.destroy(user.resume.public_id, {
            resource_type: "raw",
        });
    }

    return res.status(200).json({
        success: true,
        message: "Profile Updated",
        user: updatedUser,
    });
});



export const updatePassword = catchAsyncErrors(async (req, res, next) => {
    const { currentPassword, newPassword, confirmNewPassword } =
        req.body || {};

    if (!currentPassword || !newPassword || !confirmNewPassword) {
        return next(
            new ErrorHandler("Please fill in all fields.", 400)
        );
    }

    if (newPassword.length < 8) {
        return next(
            new ErrorHandler(
                "New password must be at least 8 characters long.",
                400
            )
        );
    }

    if (newPassword !== confirmNewPassword) {
        return next(
            new ErrorHandler(
                "New password and confirmation do not match.",
                400
            )
        );
    }

    const user = await User.findById(req.user.id).select("+password");

    if (!user) {
        return next(new ErrorHandler("User not found!", 404));
    }

    const isPasswordMatched = await user.comparePassword(currentPassword);

    if (!isPasswordMatched) {
        return next(
            new ErrorHandler("Incorrect current password!", 401)
        );
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
        success: true,
        message: "Password updated successfully!",
    });
});

export const getUserForPortfolio = catchAsyncErrors(
    async (req, res, next) => {
        const id = process.env.PORTFOLIO_OWNER_ID;

        if (!id) {
            return next(
                new ErrorHandler(
                    "Portfolio owner ID is not configured.",
                    500
                )
            );
        }

        const user = await User.findById(id).select(
            "fullName email phone aboutMe portfolioURL gitHubURL linkedInURL avatar resume"
        );

        if (!user) {
            return next(
                new ErrorHandler("Portfolio owner not found!", 404)
            );
        }

        return res.status(200).json({
            success: true,
            user,
        });
    }
);



export const forgotPassword = catchAsyncErrors(async (req, res, next) => {
    const { email } = req.body || {};

    if (!email) {
        return next(
            new ErrorHandler("Please provide your email address.", 400)
        );
    }

    const user = await User.findOne({ email });

    // Use the same response for registered and unregistered emails
    if (!user) {
        return res.status(200).json({
            success: true,
            message:
                "If an account exists with this email, a password reset link will be sent.",
        });
    }

    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    const resetPasswordUrl =
        `${process.env.DASHBOARD_URL}/password/reset/${resetToken}`;

    const message =
        `Use the following link to reset your password:\n\n` +
        `${resetPasswordUrl}\n\n` +
        "If you did not request this, please ignore this email.";

    try {
        await sendEmail({
            email: user.email,
            subject: "Personal Portfolio Dashboard Password Recovery",
            message,
        });

        return res.status(200).json({
            success: true,
            message:
                "If an account exists with this email, a password reset link will be sent.",
        });
    } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save({ validateBeforeSave: false });

        return next(
            new ErrorHandler("Failed to send password reset email.", 500)
        );
    }
});



export const resetPassword = catchAsyncErrors(async (req, res, next) => {
    const { token } = req.params;
    const { password, confirmPassword } = req.body || {};

    if (!token) {
        return next(
            new ErrorHandler("Reset password token is required.", 400)
        );
    }

    if (!password || !confirmPassword) {
        return next(
            new ErrorHandler(
                "Password and confirm password are required.",
                400
            )
        );
    }

    if (password.length < 8) {
        return next(
            new ErrorHandler(
                "Password must be at least 8 characters long.",
                400
            )
        );
    }

    if (password !== confirmPassword) {
        return next(
            new ErrorHandler(
                "Password and confirm password do not match.",
                400
            )
        );
    }

    const resetPasswordToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
        return next(
            new ErrorHandler(
                "Reset password token is invalid or has expired.",
                400
            )
        );
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    return generateToken(
        user,
        "Password reset successfully!",
        200,
        res
    );
});
