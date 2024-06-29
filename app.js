const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");

const dbPath = path.join(__dirname, "userData.db");
const app = express();
app.use(express.json());

let db = null;

const initializeDBAndServer = async (request, response) => {

    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        app.listen(3000, () => {
            console.log("Server Running at http://localhost:3000/");
        });

    } catch (e) {
        console.log(`DB Error: ${e.message}`);
        process.exit(1);
    }
};

initializeDBAndServer();

module.exports = app;

// API 1 - POST If the username already exists, 
// If the registrant provides a password with less than 5 characters
// Successful registration of the registrant
app.post("/register", async (request, response) => {    
    const { username, name, password, gender, location } = request.body;
    let hashedPassword = await bcrypt.hash(password, 10);
    
    const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
    const dbUser = await db.get(selectUserQuery);

    if (dbUser === undefined) {        
        if (password.length < 5) {
            response.status(400);
            response.send("Password is too short");
        } else {
            let createUserQuery = `
                INSERT INTO 
                    user (username, name, password, gender, location)
                VALUES (
                    '${username}',
                    '${name}',
                    '${hashedPassword}',
                    '${gender}',
                    '${location}'
                );`;
            await db.run(createUserQuery);
            response.status(200);
            response.send("User created successfully");
        }
    } else {
        response.status(400);
        response.send("User already exists");
    }
});

// API 2 - POST If an unregistered user tries to login
// If the user provides incorrect password
// Successful login of the user
app.post("/login", async (request, response) => {
    const { username, password } = request.body;
    const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
    const dbUser = await db.get(selectUserQuery);

    if (dbUser === undefined) {
        response.status(400);
        response.send("Invalid user");
    } else {
        const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
        if (isPasswordMatched === true) {
            response.status(200);
            response.send("Login success!");            
        } else {
            response.status(400);
            response.send("Invalid password");
        }
    }    
});

// API - 3 PUT If the user provides incorrect current password
// If the user provides new password with less than 5 characters
// Successful password update
app.put("/change-password", async (request, response) => {
    const { username, oldPassword, newPassword } = request.body;
    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    const userSelectQuery = `SELECT * FROM user WHERE username = '${username}'`;
    const dbUser = await db.get(userSelectQuery);
    const isOldPasswordMatched = await bcrypt.compare(oldPassword, dbUser.password);

    if (isOldPasswordMatched === true) {
        if (newPassword.length < 5) {
            response.status(400);
            response.send("Password is too short");
        } else {
            const updatePasswordQuery = `
                UPDATE
                    user
                SET
                    password = '${newHashedPassword}'
                WHERE
                    username = '${username}';`;

            await db.run(updatePasswordQuery);
            response.status(200);
            response.send("Password updated");
        }
    } else {
        response.status(400);
        response.send("Invalid current password");
    }
});