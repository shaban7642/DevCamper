const path = require('path');
const Bootcamp = require('../models/Bootcamp');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const geocoder = require('../utils/geocoder');


// @desc   get all bootcamps
// @route  GET /api/v1/bootcamps
// @access public
exports.getBootcamps = asyncHandler( async (req , res , next) => {
    res.status(200).json(res.advancedResults);
});

// @desc   get single bootcamp
// @route  GET /api/v1/bootcamps/:id
// @access public
exports.getBootcamp = asyncHandler( async (req , res , next) => {
        const bootcamp = await Bootcamp.findById(req.params.id).populate('courses');
        if(!bootcamp) {
            return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404));
        }
        res.status(200).json({
            success: true,
            data: bootcamp
        });
});

// @desc   create new bootcamp
// @route  POST /api/v1/bootcamps
// @access private
exports.createBootcamp = asyncHandler( async (req , res , next) => {
        // Add user to req.body
        req.body.user = req.user.id;
        console.log(req.user);

        // Check for published bootcamp
        const publishedBootcamp = await Bootcamp.findOne({ user: req.user.id });

        // If the iser is not an admin, they can only add one bootcamp
        if (publishedBootcamp && req.user.role !== 'admin') {
            return next(new ErrorResponse(`The user with this id ${req.user.id} has already published a bootcamp`, 400));
        }

        const bootcamp = await Bootcamp.create(req.body);
        res.status(201).json({
            success: true,
            data: bootcamp
        });
});

// @desc   update bootcamp
// @route  PUT /api/v1/bootcamps/:id
// @access private
exports.updateBootcamp = asyncHandler( async(req , res , next) => {
        let bootcamp = await Bootcamp.findById(req.params.id );
        if(!bootcamp) {
            return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404));
        }

        // Make sure user is bootcamp owner
        if (bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return next(new ErrorResponse(`The user with this id ${req.user.id} is not authroized to update this bootcamp`, 401));
        }

        bootcamp = await Bootcamp.findByIdAndUpdate(req.params.id,  req.body, { new: true, runValidators: true});
        
        res.status(201).json({
            success: true,
            data: bootcamp
        });
});

// @desc   delete bootcamp
// @route  DELETE /api/v1/bootcamps/:id
// @access private
exports.deleteBootcamp = asyncHandler( async (req , res , next) => {
        const bootcamp = await Bootcamp.findById(req.params.id);
        if(!bootcamp) {
            return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404));
        }

        // Make sure user is bootcamp owner
        if (bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return next(new ErrorResponse(`The user with this id ${req.user.id} is not authroized to delete this bootcamp`, 401));
        }

        await bootcamp.remove();

        res.status(201).json({
            success: true,
            data: bootcamp
        });
});

// @desc   get bootcamps within a radius
// @route  GET /api/v1/bootcamps/radius/:zipcode/:distance
// @access private
exports.getBootcampsInRadius = asyncHandler( async (req , res , next) => {
    const { zipcode, distance } = req.params;

    // Get lat/lng from geocoder
    const loc = await geocoder.geocode(zipcode);
    const lat = loc[0].latitude;
    const lng = loc[0].longitude;

    // Calc radius using uadiand 
    // Divide dist by radius of Earth
    // Earth radius = 3,963 mi / 6,376 km
    const earthRadius = 3963.2;
    const radius = distance / earthRadius;
    
    const bootcamps = await Bootcamp.find({
        "location.coordinates": {
            $geoWithin: { $centerSphere: [ [ lng, lat  ], radius ] }
        }
    });

    res.status(200).json({
        success: true,
        count: bootcamps.length,
        data: bootcamps
    });	
});

// @desc   upload bootcamp photo
// @route  PUT /api/v1/bootcamps/:id/photo
// @access private
exports.bootcampPhotoUpload = asyncHandler( async (req , res , next) => {
    const bootcamp = await Bootcamp.findById(req.params.id);
    if(!bootcamp) {
        return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404));
    }

    // Make sure user is bootcamp owner
    if (bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(new ErrorResponse(`The user with this id ${req.user.id} is not authroized to update this bootcamp`, 401));
    }

    if(!req.files) {
        return next(new ErrorResponse(`Please upload a file`, 400));
    }

    const file = req.files.file;

    // Make sure the file is photo
    if(!file.mimetype.startsWith('image')) {
        return next(new ErrorResponse(`Please upload an image file`, 400));
    }

    // Check filesize
    if(file.size > process.env.MAX_FILE_UPLOAD) {
        return next(new ErrorResponse(`Please upload a image less than ${process.env.MAX_FILE_UPLOAD}`, 400));
    }

    // Create custom filename
    file.name = `photo_${bootcamp._id}${path.parse(file.name).ext}`;

    file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async err => {
        if(err) {
            console.log(err);
            return next(new ErrorResponse(`problem with file upload`, 400));
        }

        await Bootcamp.findByIdAndUpdate(req.params.id, { photo: file.name });

        res.status(200).json({
            success: true,
            data: file.name
        });
    });

});