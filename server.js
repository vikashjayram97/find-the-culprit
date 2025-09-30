const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from "public"
app.use(express.static(path.join(__dirname, "public")));

// Serve index.html for "/"
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Word bank: [real word, hint word]
const wordBank = [
  ["Apple", "Fruit"],
  ["Tiger", "Big Cat"],
  ["Football", "Sport"],
  ["Doctor", "Hospital"],
  ["Pizza", "Cheese"],
  ["Library", "Books"],
  ["River", "Water"],
  ["Elephant", "Big Animal"],
  ["Guitar", "Music"],
  ["Plane", "Travel"],
];

let players = [];
let culprit = null;
let currentWord = null;
let descriptions = [];
let votes = {};

// Assign random words
function assignWords() {
  const randomPair = wordBank[Math.floor(Math.random() * wordBank.length)];
  currentWord = randomPair[0];
  const hintWord = randomPair[1];

  culprit = players[Math.floor(Math.random() * players.length)];

  players.forEach((player) => {
    if (player.id === culprit.id) {
      io.to(player.id).emit("yourWord", hintWord + " (Hint)");
    } else {
      io.to(player.id).emit("yourWord", currentWord);
    }
  });

  descriptions = [];
  votes = {};
}

// Handle connections
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("joinGame", (name) => {
    players.push({ id: socket.id, name });
    console.log(`${name} joined`);
    if (players.length >= 3) {
      // start when 3+ players
      assignWords();
    }
  });

  socket.on("submitDescription", (desc) => {
    const player = players.find((p) => p.id === socket.id);
    if (player) {
      descriptions.push({ player: player.name, text: desc });
    }

    if (descriptions.length === players.length) {
      io.emit("showDescriptions", descriptions);
      io.emit(
        "startVoting",
        players.map((p) => p.name)
      );
    }
  });

  socket.on("vote", (votedName) => {
    const voter = players.find((p) => p.id === socket.id);
    if (voter) {
      votes[voter.name] = votedName;
    }

    if (Object.keys(votes).length === players.length) {
      let counts = {};
      Object.values(votes).forEach((v) => {
        counts[v] = (counts[v] || 0) + 1;
      });

      let accused = Object.keys(counts).reduce((a, b) =>
        counts[a] > counts[b] ? a : b
      );

      if (accused === culprit.name) {
        io.emit(
          "showResults",
          `🎉 The Culprit was ${culprit.name}. Others WIN!`
        );
      } else {
        io.emit(
          "showResults",
          `😈 ${culprit.name} was the Culprit. Innocent ${accused} got accused → Culprit WINS!`
        );
      }
    }
  });

  socket.on("skipVote", () => {
    io.emit("showResults", "⏭️ Voting skipped. Next round begins.");
  });

  socket.on("nextRound", () => {
    assignWords();
  });

  socket.on("disconnect", () => {
    players = players.filter((p) => p.id !== socket.id);
    console.log("A user disconnected:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
