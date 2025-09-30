const socket = io();

const joinScreen = document.getElementById("join-screen");
const gameArea = document.getElementById("game-area");
const usernameInput = document.getElementById("username");
const joinBtn = document.getElementById("joinBtn");

const wordDisplay = document.getElementById("word-display");
const descSection = document.getElementById("description-section");
const descInput = document.getElementById("description");
const submitDescBtn = document.getElementById("submitDescBtn");
const allDescs = document.getElementById("all-descriptions");
const descList = document.getElementById("descriptions-list");

const votingSection = document.getElementById("voting-section");
const playersList = document.getElementById("players-list");
const skipVoteBtn = document.getElementById("skipVoteBtn");

const results = document.getElementById("results");
const resultText = document.getElementById("result-text");
const nextRoundBtn = document.getElementById("nextRoundBtn");

let playerName = "";

// Join Game
joinBtn.addEventListener("click", () => {
  playerName = usernameInput.value.trim();
  if (playerName) {
    socket.emit("joinGame", playerName);
    joinScreen.classList.add("hidden");
    gameArea.classList.remove("hidden");
  }
});

// Receive Word
socket.on("yourWord", (word) => {
  wordDisplay.textContent = "Your Word: " + word;
  descSection.classList.remove("hidden");
});

// Submit Description
submitDescBtn.addEventListener("click", () => {
  const desc = descInput.value.trim();
  if (desc) {
    socket.emit("submitDescription", desc);
    descInput.value = "";
    descSection.classList.add("hidden");
  }
});

// Show all descriptions
socket.on("showDescriptions", (descs) => {
  allDescs.classList.remove("hidden");
  descList.innerHTML = "";
  descs.forEach((d) => {
    const div = document.createElement("div");
    div.classList.add("message");
    div.textContent = `${d.player}: ${d.text}`;
    descList.appendChild(div);
  });
});

// Voting
socket.on("startVoting", (players) => {
  votingSection.classList.remove("hidden");
  playersList.innerHTML = "";
  players.forEach((p) => {
    const btn = document.createElement("button");
    btn.classList.add("vote-btn");
    btn.textContent = p;
    btn.onclick = () => {
      socket.emit("vote", p);
      votingSection.classList.add("hidden");
    };
    playersList.appendChild(btn);
  });
});

skipVoteBtn.addEventListener("click", () => {
  socket.emit("skipVote");
  votingSection.classList.add("hidden");
});

// Show results
socket.on("showResults", (text) => {
  results.classList.remove("hidden");
  resultText.textContent = text;
});

nextRoundBtn.addEventListener("click", () => {
  socket.emit("nextRound");
  results.classList.add("hidden");
});
