const router = require('express').Router();
const {
    getBootcamps,
    getBootcamp,
    createBootcamp,
    updateBootcamp,
    deleteBootcamp,
    getBootcampsInRadius,
    bootcampPhotoUpload
} = require('../controlers/bootCamps');
const advancedResults = require('../middleware/advancedResults');
const Bootcamp = require('../models/Bootcamp');
const { protect, authorize } = require('../middleware/auth');

// Include other resource routers
const coursesRoute = require('./courses');
const reviewsRoute = require('./reviews');

// Re-route into other resource routers
router.use('/:bootcampId/courses', coursesRoute);
router.use('/:bootcampId/reviews', reviewsRoute);


router.route('/:id/photo').put(protect, authorize('publisher', 'admin'), bootcampPhotoUpload);

router
	.route('/radius/:zipcode/:distance')
	.get(getBootcampsInRadius);

router
    .route('/')
    .get(advancedResults(Bootcamp, 'courses') ,getBootcamps)
    .post(protect, authorize('publisher', 'admin'), createBootcamp);

router
    .route('/:id')
    .get(getBootcamp)
    .put(protect, authorize('publisher', 'admin'), updateBootcamp)
    .delete(protect, authorize('publisher', 'admin'), deleteBootcamp);    

module.exports = router;