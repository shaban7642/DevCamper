const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    title: {
        type: String,
        trim: true,
        required: [true, 'please add a title for the review'],
        maxlength: 100
    },
    text: {
        type: String,
        required: [true, 'please add some text']
    },
    rating: {
        type: Number,
        min: 1,
        max: 10,
        required: [true, 'please add a rating between 1 and 10']
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    bootcamp: {
        type: mongoose.Schema.ObjectId,
        ref: 'Bootcamp',
        required: true
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    }
});

// Prevent user from submitting more than one review per bootcamp
reviewSchema.index({ bootcamp: 1, user: 1 }, { unique: true });

// Static method to get avg of rating
reviewSchema.statics.getAvarageRating = async function(bootcampId) {
    const obj = await this.aggregate([
        {
            $match: {bootcamp: bootcampId}
        },
        {
            $group: {
                _id: '$bootcamp',
                avarageRating: { $avg: '$rating' }
            }
        }
    ]);

    try {
        await this.model('Bootcamp').findByIdAndUpdate(bootcampId, {
            avarageRating: obj[0].avarageRating
        });
    } catch (err) {
        console.log(err);
    }
}

// Call getAvarageRating after save
reviewSchema.post('save', function() {
    this.constructor.getAvarageRating(this.bootcamp);
});

// Call getAvarageCost before remove
reviewSchema.pre('remove', function() {
    this.constructor.getAvarageRating(this.bootcamp);
});


module.exports = mongoose.model('Review', reviewSchema);