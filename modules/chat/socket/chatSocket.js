const db = require("../../../config/db");

const onlineUsers = new Map();

const initChatSocket = (io) => {

    io.on("connection", (socket) => {
        console.log(`New socket connected: ${socket.id}`);

        socket.on("user_join", (data) => {
            const { user_id } = data;
            if (!user_id) return;

            onlineUsers.set(user_id, socket.id);
            socket.user_id = user_id;

            console.log(`User online: ${user_id}`);
            console.log(`Total online: ${onlineUsers.size}`);

            io.emit("user_online", { user_id });

            socket.emit("online_users", {
                online: Array.from(onlineUsers.keys()),
            });
        });

        // ─────────────────────────────────────
        // EVENT: join_conversation
        // Client emits this when user opens a chat
        // Both users join the same "room"
        // Payload: { conversation_id }
        // ─────────────────────────────────────
        socket.on("join_conversation", (data) => {
            const { conversation_id } = data;
            if (!conversation_id) return;

            // Join the Socket.IO room for this conversation
            socket.join(conversation_id);
            console.log(`Socket ${socket.id} joined room: ${conversation_id}`);
        });

        // ─────────────────────────────────────
        // EVENT: leave_conversation
        // Client emits this when user closes a chat
        // Payload: { conversation_id }
        // ─────────────────────────────────────
        socket.on("leave_conversation", (data) => {
            const { conversation_id } = data;
            if (!conversation_id) return;

            socket.leave(conversation_id);
            console.log(`Socket ${socket.id} left room: ${conversation_id}`);
        });

        // ─────────────────────────────────────
        // EVENT: send_message
        // THE CORE REAL-TIME EVENT
        // Client emits this when user sends a message
        // Payload: { conversation_id, sender_id, receiver_id, message }
        // ─────────────────────────────────────
        socket.on("send_message", async (data) => {
            try {
                const {
                    conversation_id,
                    sender_id,
                    receiver_id,
                    message,
                    message_type,
                } = data;

                // STEP 1 — validate required fields
                if (!conversation_id || !sender_id || !receiver_id || !message) {
                    socket.emit("error", {
                        message: "Missing required fields"
                    });
                    return;
                }

                // STEP 2 — save message to MySQL database
                const [result] = await db.query(
                    `INSERT INTO chat_messages
                     (conversation_id, sender_id, receiver_id, message, message_type)
                     VALUES (?, ?, ?, ?, ?)`,
                    [
                        conversation_id,
                        sender_id,
                        receiver_id,
                        message,
                        message_type || "text",
                    ]
                );

                // STEP 3 — update last_message in conversation
                await db.query(
                    `UPDATE chat_conversations
                     SET last_message = ?,
                         last_message_at = CURRENT_TIMESTAMP
                     WHERE conversation_id = ?`,
                    [message.substring(0, 100), conversation_id]
                );

                // STEP 4 — fetch saved message with sender details
                const [savedMessage] = await db.query(
                    `SELECT
                        m.*,
                        u.full_name AS sender_name,
                        u.profile_image AS sender_image
                     FROM chat_messages m
                     LEFT JOIN user_signup u ON m.sender_id = u.user_id
                     WHERE m.id = ?`,
                    [result.insertId]
                );

                const messageToSend = savedMessage[0];

                // STEP 5 — broadcast to everyone in the conversation room
                // Both sender and receiver get the message instantly
                io.to(conversation_id).emit("receive_message", messageToSend);

                console.log(`Message: ${sender_id} → ${receiver_id}`);
                console.log(`Content: "${message}"`);

                // STEP 6 — if receiver is online but NOT in the room
                // send them a notification ping
                if (onlineUsers.has(receiver_id)) {
                    const receiverSocketId = onlineUsers.get(receiver_id);
                    io.to(receiverSocketId).emit("new_message_notification", {
                        conversation_id,
                        sender_id,
                        sender_name: messageToSend.sender_name,
                        message_preview: message.substring(0, 50),
                    });
                }

            } catch (error) {
                console.error("send_message socket error:", error);
                socket.emit("error", {
                    message: "Failed to send message"
                });
            }
        });

        socket.on("disconnect", () => {
            const user_id = socket.user_id;
            if (user_id) {
                onlineUsers.delete(user_id);
                console.log(`User offline: ${user_id}`);
                console.log(`Total online: ${onlineUsers.size}`);
                io.emit("user_offline", { user_id });
            }
            console.log(`Socket disconnected: ${socket.id}`);
        });

    });
};

module.exports = { initChatSocket, onlineUsers };


// const db = require("../../../config/db");

// // ─────────────────────────────────────────────
// // onlineUsers — tracks who is currently online
// //
// // This is a Map (key-value store in memory)
// // Key   = user_id     e.g. "user_001"
// // Value = socket.id   e.g. "abc123xyz"
// //
// // When user opens app  → added to Map
// // When user closes app → removed from Map
// // ─────────────────────────────────────────────
// const onlineUsers = new Map();

// const initChatSocket = (io) => {

//     io.on("connection", (socket) => {
//         // This fires every time a client connects
//         // socket.id is a unique ID auto-assigned by Socket.IO
//         // like a temporary phone number for this session
//         console.log(`New socket connected: ${socket.id}`);

//         // ─────────────────────────────────────
//         // EVENT: user_join
//         // Client emits this when user opens the app
//         // Payload: { user_id }
//         // ─────────────────────────────────────
//         socket.on("user_join", (data) => {
//             const { user_id } = data;

//             if (!user_id) return;

//             // STEP 1 — save this user as online
//             // attach user_id to the socket object itself
//             // so we can access it later on disconnect
//             onlineUsers.set(user_id, socket.id);
//             socket.user_id = user_id;

//             console.log(`User online: ${user_id}`);
//             console.log(`Total online: ${onlineUsers.size}`);

//             // STEP 2 — tell ALL connected clients this user is online
//             // so their green dots update in real time
//             io.emit("user_online", { user_id });

//             // STEP 3 — send this user the full list of who is online right now
//             socket.emit("online_users", {
//                 online: Array.from(onlineUsers.keys()),
//             });
//         });

//         // ─────────────────────────────────────
//         // EVENT: disconnect
//         // Fires AUTOMATICALLY when user closes
//         // browser tab, app, or loses internet
//         // No client code needed — Socket.IO handles it
//         // ─────────────────────────────────────
//         socket.on("disconnect", () => {
//             const user_id = socket.user_id;

//             if (user_id) {
//                 // STEP 1 — remove from online list
//                 onlineUsers.delete(user_id);
//                 console.log(`User offline: ${user_id}`);
//                 console.log(`Total online: ${onlineUsers.size}`);

//                 // STEP 2 — tell everyone this user went offline
//                 io.emit("user_offline", { user_id });
//             }

//             console.log(`Socket disconnected: ${socket.id}`);
//         });

//     });
// };

// module.exports = { initChatSocket, onlineUsers };