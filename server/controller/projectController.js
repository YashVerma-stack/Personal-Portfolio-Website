import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js"
import ErrorHandler from "../middlewares/error.js";
import { Project } from '../models/projectSchema.js';
import { v2 as cloudinary } from 'cloudinary';

export const addNewProject = catchAsyncErrors(async (req, res, next) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return next(new ErrorHandler("Project Banner Image Required"));
    }
    const { projectBanner } = req.files;
    const {
        title,
        description,
        gitRepoLink,
        projectLink,
        technologies,
        stack,
        deployed,
    } = req.body || {};

    if (
        !title ||
        !description ||
        !gitRepoLink ||
        !projectLink ||
        !technologies ||
        !stack ||
        !deployed
    ) {
        return next(new ErrorHandler("Please Provide All Details!", 400));
    }

    const cloudinaryResponse = await cloudinary.uploader.upload(
        projectBanner.tempFilePath,
        { folder: "PORTFOLIO PROJECT IMAGES" }
    );

    if (!cloudinaryResponse || cloudinaryResponse.error) {
        console.error(
            "Cloudinary Error:",
            cloudinaryResponse.error || "Unknown Cloudinary Error"
        );
        return next(new ErrorHandler("Failed to upload projectBanner to cloudinary", 500));
    }

    const project = await Project.create({
        title,
        description,
        gitRepoLink,
        projectLink,
        technologies,
        stack,
        deployed,
        projectBanner: {
            public_id: cloudinaryResponse.public_id,
            url: cloudinaryResponse.secure_url,
        },
    });

    res.status(201).json({
        success: true,
        message: "New Project Added!",
        project,
    });
});

export const updateProject = catchAsyncErrors(async (req, res, next) => {

    const { id } = req.params;

    // 1. Find existing project
    const project = await Project.findById(id);

    if (!project) {
        return next(new ErrorHandler("Project Not Found!", 404));
    }

    // 2. Get request body safely
    const {
        title,
        description,
        gitRepoLink,
        projectLink,
        technologies,
        stack,
        deployed,
    } = req.body || {};

    // 3. Prepare updated project data
    const newProjectData = {};

    if (title !== undefined) newProjectData.title = title;
    if (description !== undefined) newProjectData.description = description;
    if (gitRepoLink !== undefined) newProjectData.gitRepoLink = gitRepoLink;
    if (projectLink !== undefined) newProjectData.projectLink = projectLink;
    if (technologies !== undefined) newProjectData.technologies = technologies;
    if (stack !== undefined) newProjectData.stack = stack;
    if (deployed !== undefined) newProjectData.deployed = deployed;

    // 4. Handle project banner update
    if (req.files && req.files.projectBanner) {

        const projectBanner = req.files.projectBanner;

        // Upload new image first
        const cloudinaryResponse = await cloudinary.uploader.upload(
            projectBanner.tempFilePath,
            {
                folder: "PORTFOLIO PROJECT IMAGES",
            }
        );

        if (!cloudinaryResponse || cloudinaryResponse.error) {
            return next(
                new ErrorHandler("Failed to upload project banner!", 500)
            );
        }

        // Add new banner details
        newProjectData.projectBanner = {
            public_id: cloudinaryResponse.public_id,
            url: cloudinaryResponse.secure_url,
        };
    }

    // 5. Check if there is anything to update
    if (Object.keys(newProjectData).length === 0) {
        return next(
            new ErrorHandler("Please provide project details to update!", 400)
        );
    }

    // 6. Update project in database
    const updatedProject = await Project.findByIdAndUpdate(
        id,
        newProjectData,
        {
            returnDocument: "after",
            runValidators: true,
        }
    );

    // 7. Delete old banner after successful database update
    if (newProjectData.projectBanner) {
        await cloudinary.uploader.destroy(
            project.projectBanner.public_id
        );
    }

    // 8. Send response
    res.status(200).json({
        success: true,
        message: "Project Updated!",
        project: updatedProject,
    });
});

export const deleteProject = catchAsyncErrors(async (req, res, next) => {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project) {
        return next(new ErrorHandler("Project Not Found!", 404));
    }
    await project.deleteOne();
    res.status(200).json({
        success: true,
        message: "Project Deleted!",
    });
});

export const getAllProjects = catchAsyncErrors(async (req, res, next) => {
    const projects = await Project.find();
    res.status(200).json({
        success: true,
        projects,
    });
});

export const getSingleProject = catchAsyncErrors(async (req, res, next) => {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project) {
        return next(new ErrorHandler("Project Not Found!", 404));
    }
    res.status(200).json({
        success: true,
        project,
    });
});