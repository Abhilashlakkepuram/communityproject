const express = require("express");
const router = express.Router();
const { uploadSingle } = require("../../../middlewares/uploadMiddleware");
const {
    getChatUsers,
    startConversation,
    getUserConversations,
    getMessages,
    sendMessage,
    deleteMessage,
    getUnreadCount,
    uploadChatFile,
} = require("../controller/chatController");
// We will import the controller functions here later
// For now we are just planning all the routes

// ─────────────────────────────────────────
// USERS
// ─────────────────────────────────────────

// GET /api/chat/users/:user_id
// → Get all members this user can chat with
router.get("/users/:user_id", getChatUsers);
// ─────────────────────────────────────────
// CONVERSATIONS
// ─────────────────────────────────────────

// POST /api/chat/conversation/start
// → Start or open existing conversation between two users
router.post("/conversation/start", startConversation);

// GET /api/chat/conversations/:user_id
// → Get all conversations for a user (inbox list)
router.get("/conversations/:user_id", getUserConversations);

// ─────────────────────────────────────────
// MESSAGES
// ─────────────────────────────────────────

// GET /api/chat/messages/:conversation_id
// → Get all messages in a conversation (chat history)
router.get("/messages/:conversation_id", getMessages);

// POST /api/chat/message/send
// → Send a message
router.post("/message/send", sendMessage);

// DELETE /api/chat/message/:message_id
// → Delete a message (soft delete)
router.delete("/message/:message_id", deleteMessage);

// ─────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────

// GET /api/chat/unread/:user_id
// → Get unread message count for notification badge
router.get("/unread/:user_id", getUnreadCount);

// POST /api/chat/message/upload
// Upload image or file in chat (max 1MB)
router.post("/message/upload", uploadSingle("chat_file"), uploadChatFile);

module.exports = router;