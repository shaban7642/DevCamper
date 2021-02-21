const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const colors = require('colors');
const fileUpload = require('express-fileupload');
const cookiParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');

// load env vars
dotenv.config({ path: './config/config.env' });

// connecting to database
connectDB();

// load routes
const bootcampsRoute = require('./routes/bootcamps');
const coursesRoute = require('./routes/courses');
const auth = require('./routes/auth');
const users = require('./routes/users');
const reviews = require('./routes/reviews');

const app = express();

const PORT = process.env.PORT || 5000;

// body parser
app.use(express.json());

// cookie parser
app.use(cookiParser());

// use file upload
app.use(fileUpload());

// snitize data
app.use(mongoSanitize());

// set security headers
app.use(helmet());

// prevent XSS atatcks
app.use(xss());

// Rate limiting
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 100
});

app.use(limiter);

// prevent http param pollution
app.use(hpp());

// Enable CORS
app.use(cors());

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// use routes
app.use('/api/v1/bootcamps' , bootcampsRoute);
app.use('/api/v1/courses' , coursesRoute); 
app.use('/api/v1/auth' , auth);
app.use('/api/v1/users' , users);
app.use('/api/v1/reviews' , reviews);

app.use(errorHandler);

const server = app.listen(PORT, () => {
    console.log(`server is running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold);
});

// Handle unhandled promise rejections
process.on('unhandledRejection' , (err , promise) => {
    console.log(`Error: ${err.message}`.red.bold);
    // close the server & exit process
    server.close(() => process.exit(1));
})