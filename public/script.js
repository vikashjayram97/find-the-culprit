const socket = io();

let roomCode = null;
let myId = null;
let isHost = false;

// UI helpers
function hideAll() {
  document.querySelectorAll("div").forEach((d) => d.classList.add("hidden"));
}
function goHome() {
  hideAll();
  document.getElementById("home").classList.remove("hidden");
}
function showCreateRoom() {
  hideAll();
  document.getElementById("createRoom").classList.remove("hidden");
}
function showJoinRoom() {
  hideAll();
  document.getElementById("joinRoom").classList.remove("hidden");
}

function createRoom() {
  const hostName = document.getElementById("hostName").value;
  const playerCount = parseInt(document.getElementById("playerCount").value);
  roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
  isHost = true;
  socket.emit("createRoom", { roomCode, hostName, playerCount });
  document.getElementById("roomCodeDisplay").innerText = roomCode;
  hideAll();
  document.getElementById("lobby").classList.remove("hidden");
}

function joinRoom() {
  const joinName = document.getElementById("joinName").value;
  roomCode = document.getElementById("roomCodeJoin").value;
  socket.emit("joinRoom", { roomCode, playerName: joinName });
  document.getElementById("roomCodeDisplay").innerText = roomCode;
  hideAll();
  document.getElementById("lobby").classList.remove("hidden");
}

socket.on("lobbyUpdate", (players) => {
  const list = document.getElementById("playerList");
  list.innerHTML = "";
  Object.values(players).forEach((p) => {
    const li = document.createElement("li");
    li.innerText = p.name + (p.isHost ? " (Host)" : "");
    list.appendChild(li);
  });
  if (isHost) document.getElementById("startBtn").classList.remove("hidden");
});

function startGame() {
  socket.emit("startGame", roomCode);
}

socket.on("wordAssignment", ({ word, isCulprit }) => {
  hideAll();
  document.getElementById("game").classList.remove("hidden");
  document.getElementById("yourWord").innerText = `Your word: ${word}`;
});

socket.on("roundUpdate", ({ round, max }) => {
  document.getElementById(
    "roundDisplay"
  ).innerText = `Round ${round} of ${max}`;
  document.getElementById("descriptions").classList.add("hidden");
  document.getElementById("voting").classList.add("hidden");
});

function submitDescription() {
  const desc = document.getElementById("descInput").value;
  socket.emit("submitDescription", { roomCode, description: desc });
  document.getElementById("descInput").value = "";
}

socket.on("showDescriptions", (descs) => {
  const box = document.getElementById("descriptions");
  box.innerHTML = "<h3>Descriptions</h3>";
  descs.forEach((d) => {
    const p = document.createElement("p");
    p.innerText = `${d.player}: ${d.text}`;
    box.appendChild(p);
  });
  box.classList.remove("hidden");

  const voteDiv = document.getElementById("voting");
  voteDiv.innerHTML = "<h3>Vote</h3>";
  descs.forEach((d) => {
    const btn = document.createElement("button");
    btn.innerText = `Accuse ${d.player}`;
    btn.onclick = () =>
      socket.emit("submitVote", {
        roomCode,
        suspectId: d.playerId,
        skip: false,
      });
    voteDiv.appendChild(btn);
  });
  const skipBtn = document.createElement("button");
  skipBtn.innerText = "Skip Vote";
  skipBtn.onclick = () => socket.emit("submitVote", { roomCode, skip: true });
  voteDiv.appendChild(skipBtn);

  voteDiv.classList.remove("hidden");
});

socket.on("gameOver", ({ winner, reason }) => {
  document.getElementById("winner").innerText = `${winner} win! (${reason})`;
  document.getElementById("winner").classList.remove("hidden");
  document.getElementById("descriptions").classList.add("hidden");
  document.getElementById("voting").classList.add("hidden");
});
