require("dotenv").config();
const express = require("express");
const expressWs = require("express-ws");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcrypt");

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/vote";
const SESSION_SECRET = process.env.SESSION_SECRET;
const app = express();
expressWs(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(
  session({
    secret: "voting-app-secret",
    resave: false,
    saveUninitialized: false,
  })
);

// MongoDB Connection
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// MongoDB Schema & Models
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});
const pollSchema = new mongoose.Schema({
  question: String,
  options: [{ answer: String, votes: { type: Number, default: 0 } }],
});
const User = mongoose.model("User", userSchema);
const Poll = mongoose.model("Poll", pollSchema);

let connectedClients = [];

// WebSocket Handling
app.ws("/ws", (socket) => {
  connectedClients.push(socket);

  socket.on("close", () => {
    connectedClients = connectedClients.filter((client) => client !== socket);
  });
});

// Routes
app.get("/", (req, res) => {
  if (req.session.user?.id) return res.redirect("/dashboard");
  res.render("index/unauthenticatedIndex");
});

app.get("/login", (req, res) => {
  res.render("login", { errorMessage: null });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (user && (await bcrypt.compare(password, user.password))) {
    req.session.user = { id: user._id, username: user.username };
    return res.redirect("/dashboard");
  }
  return res.render("login", { errorMessage: "Invalid username or password" });
});

app.get("/signup", (req, res) => {
  res.render("signup", { errorMessage: null });
});

app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.render("signup", { errorMessage: "Username already exists" });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  await new User({ username, password: hashedPassword }).save();
  res.redirect("/login");
});

app.get("/dashboard", async (req, res) => {
  if (!req.session.user?.id) return res.redirect("/");
  const polls = await Poll.find();
  res.render("index/authenticatedIndex", { polls });
});

app.get("/createPoll", (req, res) => {
  if (!req.session.user?.id) return res.redirect("/");
  res.render("createPoll");
});

app.post("/createPoll", async (req, res) => {
  const { question, options } = req.body;
  const formattedOptions = Object.values(options).map((option) => ({
    answer: option,
    votes: 0,
  }));
  const error = await onCreateNewPoll(question, formattedOptions);
  if (error) {
    return res.render("createPoll", { errorMessage: error });
  }
  res.redirect("/dashboard");
});

async function onCreateNewPoll(question, pollOptions) {
  try {
    const newPoll = new Poll({ question, options: pollOptions });
    await newPoll.save();

    connectedClients.forEach((socket) => {
      socket.send(JSON.stringify({ type: "new-poll", poll: newPoll }));
    });
    return null;
  } catch (error) {
    console.error("Error creating poll:", error);
    return "Failed to create poll";
  }
}

async function onNewVote(pollId, selectedOption) {
  try {
    const poll = await Poll.findById(pollId);
    const option = poll.options.find((opt) => opt.answer === selectedOption);
    if (option) option.votes += 1;
    await poll.save();

    connectedClients.forEach((socket) => {
      socket.send(
        JSON.stringify({ type: "vote-update", pollId, options: poll.options })
      );
    });
  } catch (error) {
    console.error("Error updating vote:", error);
  }
}

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
