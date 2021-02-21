const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        trim: true,
        required: [true, 'please add a cuorse title']
    },
    description: {
        type: String,
        required: [true, 'please add a cuorse description']
    },
    weeks: {
        type: String,
        required: [true, 'please add a cuorse weeks']
    },
    tuition: {
        type: Number,
        required: [true, 'please add a cuorse cost']
    },
    minimumSkill: {
        type: String,
        required: [true, 'please add a minimum skill'],
        enum: ['beginner', 'intermediate', 'advanced']
    },
    scholarshipAvailable: {
        type: Boolean,
        default: false
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

// Static method to get avg of course tutions
courseSchema.statics.getAvarageCost = async function(bootcampId) {
    const obj = await this.aggregate([
        {
            $match: {bootcamp: bootcampId}
        },
        {
            $group: {
                _id: '$bootcamp',
                avarageCost: { $avg: '$tuition' }
            }
        }
    ]);

    try {
        await this.model('Bootcamp').findByIdAndUpdate(bootcampId, {
            avarageCost: Math.ceil(obj[0].avarageCost / 10) * 10
        });
    } catch (err) {
        console.log(err);
    }
}

// Call getAvarageCost after save
courseSchema.post('save', function() {
    this.constructor.getAvarageCost(this.bootcamp);
});

// Call getAvarageCost before remove
courseSchema.pre('remove', function() {
    this.constructor.getAvarageCost(this.bootcamp);
});

module.exports = mongoose.model('Course', courseSchema);
