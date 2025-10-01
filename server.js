const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

// --- Word Bank ---
const wordBank = [
  { word: "Tiger", hint: "Wild Cat" },
  { word: "Apple", hint: "Keeps doctor away" },
  { word: "Football", hint: "Round game" },
  { word: "Sun", hint: "Gives light" },
  { word: "School", hint: "Place to learn" },
];

let rooms = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Host creates a room
  socket.on("createRoom", ({ roomCode, hostName, playerCount }) => {
    rooms[roomCode] = {
      host: socket.id,
      players: {},
      round: 0,
      maxRounds: 4,
      culpritId: null,
      word: null,
      hint: null,
      descriptions: [],
      votes: {},
      playerCount: playerCount,
    };

    rooms[roomCode].players[socket.id] = { name: hostName, isHost: true };
    socket.join(roomCode);

    io.to(roomCode).emit("lobbyUpdate", rooms[roomCode].players);
  });

  // Player joins room
  socket.on("joinRoom", ({ roomCode, playerName }) => {
    if (!rooms[roomCode]) {
      socket.emit("errorMsg", "Room does not exist.");
      return;
    }

    rooms[roomCode].players[socket.id] = { name: playerName, isHost: false };
    socket.join(roomCode);

    io.to(roomCode).emit("lobbyUpdate", rooms[roomCode].players);
  });

  // Host starts the game
  socket.on("startGame", (roomCode) => {
    let room = rooms[roomCode];
    if (!room) return;

    const randomPair = wordBank[Math.floor(Math.random() * wordBank.length)];
    room.word = randomPair.word;
    room.hint = randomPair.hint;

    const playerIds = Object.keys(room.players);
    const culpritIndex = Math.floor(Math.random() * playerIds.length);
    room.culpritId = playerIds[culpritIndex];
    room.round = 1;

    playerIds.forEach((pid) => {
      if (pid === room.culpritId) {
        io.to(pid).emit("wordAssignment", { word: room.hint, isCulprit: true });
      } else {
        io.to(pid).emit("wordAssignment", {
          word: room.word,
          isCulprit: false,
        });
      }
    });

    io.to(roomCode).emit("roundUpdate", {
      round: room.round,
      max: room.maxRounds,
    });
  });

  // Player submits description
  socket.on("submitDescription", ({ roomCode, description }) => {
    let room = rooms[roomCode];
    if (!room) return;

    room.descriptions.push({ playerId: socket.id, text: description });

    if (room.descriptions.length === Object.keys(room.players).length) {
      io.to(roomCode).emit(
        "showDescriptions",
        room.descriptions.map((d) => ({
          player: room.players[d.playerId].name,
          text: d.text,
        }))
      );
    }
  });

  // Voting phase
  socket.on("submitVote", ({ roomCode, suspectId, skip }) => {
    let room = rooms[roomCode];
    if (!room) return;

    if (skip) {
      room.votes[socket.id] = "skip";
    } else {
      room.votes[socket.id] = suspectId;
    }

    if (Object.keys(room.votes).length === Object.keys(room.players).length) {
      // Process votes
      let voteCounts = {};
      Object.values(room.votes).forEach((v) => {
        if (v !== "skip") voteCounts[v] = (voteCounts[v] || 0) + 1;
      });

      let accused = Object.keys(voteCounts).reduce(
        (a, b) => (voteCounts[a] > voteCounts[b] ? a : b),
        null
      );

      if (accused) {
        if (accused === room.culpritId) {
          io.to(roomCode).emit("gameOver", {
            winner: "Innocents",
            reason: "Culprit caught!",
          });
        } else {
          io.to(roomCode).emit("gameOver", {
            winner: "Culprit",
            reason: "Innocent accused!",
          });
        }
        delete rooms[roomCode];
      } else {
        // No one accused → next round
        room.round++;
        room.descriptions = [];
        room.votes = {};

        if (room.round > room.maxRounds) {
          io.to(roomCode).emit("gameOver", {
            winner: "Culprit",
            reason: "Survived all rounds!",
          });
          delete rooms[roomCode];
        } else {
          io.to(roomCode).emit("roundUpdate", {
            round: room.round,
            max: room.maxRounds,
          });
        }
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    for (let roomCode in rooms) {
      if (rooms[roomCode].players[socket.id]) {
        delete rooms[roomCode].players[socket.id];
        io.to(roomCode).emit("lobbyUpdate", rooms[roomCode].players);
      }
    }
  });
});

server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
