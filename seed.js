require("dotenv").config();
const mongoose = require("mongoose");
const Poll = require("../models/Poll"); 
const User = require("../models/User"); 

// MongoDB URI from .env file
const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB for seeding"))
  .catch((err) => console.error("MongoDB connection error:", err));

//  data to seed
const users = [
  { username: "john_doe", password: "password123" },
  { username: "jane_doe", password: "password456" },
  { username: "admin", password: "admin123" },
];

const polls = [
  {
    question: "What is your favorite color?",
    options: [
      { answer: "Red", votes: 0 },
      { answer: "Blue", votes: 0 },
      { answer: "Green", votes: 0 },
    ],
  },
  {
    question: "Which programming language do you prefer?",
    options: [
      { answer: "JavaScript", votes: 0 },
      { answer: "Python", votes: 0 },
      { answer: "Java", votes: 0 },
    ],
  },
];

// Function to seed the data
const seedDatabase = async () => {
  try {

    await Poll.deleteMany({});
    await User.deleteMany({});

    /
    const userPromises = users.map((user) => new User(user).save());
    await Promise.all(userPromises);

    
    const pollPromises = polls.map((poll) => new Poll(poll).save());
    await Promise.all(pollPromises);

    console.log("Database seeded successfully!");
    mongoose.connection.close();
  } catch (error) {
    console.error("Error seeding database:", error);
    mongoose.connection.close();
  }
};

seedDatabase();
