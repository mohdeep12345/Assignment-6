/********************************************************************************* 

WEB322 – Assignment 6

I declare that this assignment is my own work in accordance with Seneca
Academic Policy. No part of this assignment has been copied manually or 
electronically from any other source (including 3rd party web sites) or 
distributed to other students. I acknoledge that violation of this policy
to any degree results in a ZERO for this assignment and possible failure of
the course. 

Name:   Mohdeep Singh
Student ID:   109600239
Date:  03 November 2024
Cyclic Web App URL:  https://assignment-4-mkan.onrender.com
GitHub Repository URL: https://github.com/mohdeep12345/Assignment-4.git

********************************************************************************/ 

const express = require('express');
const app = express();
const path = require('path');
const authServer = require('./auth-server'); // Import the auth server
const multer = require("multer");
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const clientSessions = require('client-sessions');

// Configure Cloudinary for image uploads
cloudinary.config({
    cloud_name: 'MOHDEEP',
    api_key: '319446695579865',
    api_secret: 'qtnAGrUvzR8WL5ydJCQpF4qBz9I',
    secure: true
});

// Set up multer to handle file uploads
const upload = multer();

// Middleware for parsing POST requests
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files
app.use(express.static('public'));

// Configure client-sessions middleware
app.use(clientSessions({
    cookieName: "session",
    secret: "assignment6_secure_key",
    duration: 2 * 60 * 1000, // 2 minutes
    activeDuration: 1000 * 60 // 1 minute
}));

// Custom middleware to make session data available to templates
app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

// Helper middleware to ensure a user is logged in
function ensureLogin(req, res, next) {
    if (!req.session.user) {
        res.redirect("/login");
    } else {
        next();
    }
}

// Routes
app.get('/', (req, res) => {
    res.redirect('/about');
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'about.html'));
});

app.get('/shop', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'shop.html'));
});

app.get('/categories', ensureLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'categories.html'));
});

app.get('/items', ensureLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'items.html'));
});

app.get('/items/add', ensureLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'addItem.html'));
});

// Authentication Routes
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.post('/register', (req, res) => {
    authServer.registerUser(req.body) // Use authServer
        .then(() => res.redirect('/login'))
        .catch(err => res.status(400).send(`<h2>${err}</h2>`));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.post('/login', (req, res) => {
    req.body.userAgent = req.get('User-Agent');  // Add user agent information to the request body
    authServer.checkUser(req.body) // Use authServer
        .then((user) => {
            req.session.user = {
                userName: user.userName,
                email: user.email,
                loginHistory: user.loginHistory
            };
            res.redirect('/items');
        })
        .catch(err => {
            console.error("Login error:", err);  // Debugging line
            res.status(400).send(`<h2>${err}</h2>`);
        });
});

app.get('/logout', (req, res) => {
    req.session.reset();
    res.redirect('/');
});

app.get('/userHistory', ensureLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'userHistory.html'));
});

// Handle item submission
app.post('/items/add', upload.single("featureImage"), ensureLogin, (req, res) => {
    if (req.file) {
        let streamUpload = (req) => {
            return new Promise((resolve, reject) => {
                let stream = cloudinary.uploader.upload_stream(
                    (error, result) => {
                        if (result) {
                            resolve(result);
                        } else {
                            reject(error);
                        }
                    }
                );

                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });
        };

        async function upload(req) {
            let result = await streamUpload(req);
            return result;
        }

        upload(req).then((uploaded) => {
            processItem(uploaded.url);
        });
    } else if (req.body.imageUrl) {
        processItem(req.body.imageUrl);
    } else {
        processItem("");
    }

    function processItem(imageUrl) {
        req.body.featureImage = imageUrl;
        res.redirect('/items');
    }
});

// 404 Route
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

// Start the server
const PORT = process.env.PORT || 8080;

Promise.all([authServer.initialize()]) // Removed storeServer initialization
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server listening on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error(`Unable to start server: ${err}`);
    });
