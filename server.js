require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");

const PORT = process.env.PORT || 8000;

// STEP A — wrap Express app inside Node's http server
const server = http.createServer(app);

// STEP B — attach Socket.IO to that http server
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

// STEP C — start listening for socket connections
// Import and initialize chat socket
const { initChatSocket } = require("./modules/chat/socket/chatSocket");
initChatSocket(io);

// STEP D — start the server (server.listen not app.listen)
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`REST APIs ready:  http://localhost:${PORT}/api`);
    console.log(`Socket.IO ready:  ws://localhost:${PORT}`);
});