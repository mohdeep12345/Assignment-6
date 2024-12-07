const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Define a schema for User
const Schema = mongoose.Schema;

const userSchema = new Schema({
    userName: { type: String, unique: true, required: true }, // Ensure userName is unique and required
    password: { type: String, required: true },
    email: { type: String, required: true },
    loginHistory: [
        {
            dateTime: Date,
            userAgent: String
        }
    ]
});

let User; // This will be initialized once the connection is established

// Initialize connection to MongoDB
module.exports.initialize = function () {
    return new Promise((resolve, reject) => {
        const db = mongoose.createConnection("mongodb+srv://rokingmohdeep:qwe123@cluster0.arjbd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");

        db.on("error", (err) => {
            reject("Error connecting to database: " + err);
        });

        db.once("open", () => {
            User = db.model("users", userSchema);
            resolve();
        });
    });
};

// Register a new user
module.exports.registerUser = function (userData) {
    return new Promise((resolve, reject) => {
        // Ensure passwords match
        if (userData.password !== userData.confirmPassword) {
            reject("Passwords do not match");
        } else if (!userData.userName || !userData.email || !userData.password || !userData.confirmPassword) {
            reject("All fields are required");
        } else {
            // Hash the password before saving
            bcrypt
                .hash(userData.password, 10)
                .then((hash) => {
                    userData.password = hash; // Replace plaintext password with hashed password
                    delete userData.confirmPassword; // Remove confirmPassword from the userData before saving

                    let newUser = new User(userData);
                    newUser
                        .save()
                        .then(() => resolve())
                        .catch((err) => {
                            if (err.code === 11000) {
                                reject("User Name already taken or email already registered");
                            } else {
                                reject("There was an error creating the user: " + err);
                            }
                        });
                })
                .catch(() => {
                    reject("Error occurred while encrypting the password");
                });
        }
    });
};

// Check user credentials during login
module.exports.checkUser = function (userData) {
    return new Promise((resolve, reject) => {
        // Use findOne for efficiency since userName is unique
        User.findOne({ userName: userData.userName })
            .then((user) => {
                if (!user) {
                    reject("Unable to find user: " + userData.userName);
                } else {
                    // Compare the provided password with the stored hashed password
                    bcrypt
                        .compare(userData.password, user.password)
                        .then((result) => {
                            if (!result) {
                                reject("Incorrect Password for user: " + userData.userName);
                            } else {
                                // Add the login event to the user's login history
                                user.loginHistory.push({
                                    dateTime: new Date().toString(),
                                    userAgent: userData.userAgent
                                });

                                // Update the user's login history in the database
                                user
                                    .save()
                                    .then(() => resolve(user))
                                    .catch((err) => {
                                        reject("There was an error verifying the user: " + err);
                                    });
                            }
                        })
                        .catch(() => {
                            reject("Error comparing passwords");
                        });
                }
            })
            .catch(() => {
                reject("Unable to find user: " + userData.userName);
            });
    });
};
