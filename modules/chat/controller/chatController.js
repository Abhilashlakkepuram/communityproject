const db = require("../../../config/db");

// ─────────────────────────────────────────────
// GET /api/chat/users/:user_id
// Get all members this user can chat with
// ─────────────────────────────────────────────
const getChatUsers = async (req, res) => {
    try {

        // STEP 1 — read the user_id from the URL
        const { user_id } = req.params;
        // STEP 2 — check this user actually exists and is active
        const [self] = await db.query(
            "SELECT user_id FROM user_signup WHERE user_id = ? AND status = 'active'",
            [user_id]
        );

        if (self.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found or inactive",
            });
        }

        // STEP 3 — fetch all other active users except self
        const [users] = await db.query(
            `SELECT 
                user_id,
                full_name,
                username,
                profile_image,
                last_login
            FROM user_signup
            WHERE user_id != ?
            AND status = 'active'
            ORDER BY full_name ASC`,
            [user_id]
        );

        // STEP 4 — send the response
        return res.status(200).json({
            success: true,
            message: "Chat users fetched successfully",
            data: users,
        });

    } catch (error) {
        console.error("getChatUsers error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// ─────────────────────────────────────────────
// POST /api/chat/conversation/start
// Start or get existing conversation
// Body: { sender_id, receiver_id }
// ─────────────────────────────────────────────
const startConversation = async (req, res) => {
    try {

        // STEP 1 — read sender and receiver from request body
        const { sender_id, receiver_id } = req.body;

        // STEP 2 — validate both fields are present
        if (!sender_id || !receiver_id) {
            return res.status(400).json({
                success: false,
                message: "sender_id and receiver_id are required",
            });
        }

        // STEP 3 — prevent chatting with yourself
        if (sender_id === receiver_id) {
            return res.status(400).json({
                success: false,
                message: "Cannot start a conversation with yourself",
            });
        }

        // STEP 4 — verify both users exist and are active
        const [users] = await db.query(
            `SELECT user_id, full_name, username, profile_image
             FROM user_signup
             WHERE user_id IN (?, ?) AND status = 'active'`,
            [sender_id, receiver_id]
        );

        if (users.length < 2) {
            return res.status(404).json({
                success: false,
                message: "One or both users not found or inactive",
            });
        }

        // STEP 5 — build the conversation_id
        // Always sort so user_001+user_002 and user_002+user_001
        // always produce the exact same conversation_id
        const conversation_id = [sender_id, receiver_id].sort().join("_");

        // STEP 6 — check if conversation already exists
        const [existing] = await db.query(
            "SELECT * FROM chat_conversations WHERE conversation_id = ?",
            [conversation_id]
        );

        if (existing.length > 0) {
            // Already exists — just return it, don't create a duplicate
            return res.status(200).json({
                success: true,
                message: "Conversation already exists",
                data: existing[0],
            });
        }

        // STEP 7 — create new conversation
        const sorted = [sender_id, receiver_id].sort();

        await db.query(
            `INSERT INTO chat_conversations
             (conversation_id, user_one_id, user_two_id)
             VALUES (?, ?, ?)`,
            [conversation_id, sorted[0], sorted[1]]
        );

        // STEP 8 — fetch and return the newly created conversation
        const [newConversation] = await db.query(
            "SELECT * FROM chat_conversations WHERE conversation_id = ?",
            [conversation_id]
        );

        return res.status(201).json({
            success: true,
            message: "Conversation started successfully",
            data: newConversation[0],
        });

    } catch (error) {
        console.error("startConversation error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// ─────────────────────────────────────────────
// GET /api/chat/conversations/:user_id
// Get all conversations for a user (inbox)
// ─────────────────────────────────────────────
const getUserConversations = async (req, res) => {
    try {

        // STEP 1 — get user_id from URL
        const { user_id } = req.params;

        // STEP 2 — verify user exists
        const [self] = await db.query(
            "SELECT user_id FROM user_signup WHERE user_id = ? AND status = 'active'",
            [user_id]
        );

        if (self.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // STEP 3 — fetch all conversations for this user
        // with the other person's profile details
        // and unread message count
        const [conversations] = await db.query(
            `SELECT
                c.conversation_id,
                c.last_message,
                c.last_message_at,
                c.created_at,

                -- Get the OTHER person's user_id
                CASE
                    WHEN c.user_one_id = ? THEN c.user_two_id
                    ELSE c.user_one_id
                END AS other_user_id,

                -- Get the OTHER person's name
                CASE
                    WHEN c.user_one_id = ? THEN u2.full_name
                    ELSE u1.full_name
                END AS other_user_name,

                -- Get the OTHER person's profile image
                CASE
                    WHEN c.user_one_id = ? THEN u2.profile_image
                    ELSE u1.profile_image
                END AS other_user_image,

                -- Count unread messages for this user
                (
                    SELECT COUNT(*)
                    FROM chat_messages m
                    WHERE m.conversation_id = c.conversation_id
                    AND m.receiver_id = ?
                    AND m.is_read = 'no'
                ) AS unread_count

            FROM chat_conversations c
            LEFT JOIN user_signup u1 ON c.user_one_id = u1.user_id
            LEFT JOIN user_signup u2 ON c.user_two_id = u2.user_id
            WHERE c.user_one_id = ? OR c.user_two_id = ?
            ORDER BY c.last_message_at DESC, c.created_at DESC`,
            [user_id, user_id, user_id, user_id, user_id, user_id]
        );

        return res.status(200).json({
            success: true,
            message: "Conversations fetched successfully",
            data: conversations,
        });

    } catch (error) {
        console.error("getUserConversations error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


// ─────────────────────────────────────────────
// GET /api/chat/messages/:conversation_id
// Get all messages in a conversation
// Query params: ?user_id=xxx&page=1&limit=50
// ─────────────────────────────────────────────
const getMessages = async (req, res) => {
    try {

        // STEP 1 — get conversation_id from URL
        // get user_id, page, limit from query params
        const { conversation_id } = req.params;
        const { user_id, page = 1, limit = 50 } = req.query;

        // STEP 2 — user_id is required
        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: "user_id is required as query param",
            });
        }

        // STEP 3 — verify conversation exists
        // AND this user is actually part of it
        const [conv] = await db.query(
            `SELECT * FROM chat_conversations
             WHERE conversation_id = ?
             AND (user_one_id = ? OR user_two_id = ?)`,
            [conversation_id, user_id, user_id]
        );

        if (conv.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found or access denied",
            });
        }

        // STEP 4 — calculate pagination offset
        // page 1 → offset 0   (messages 1-50)
        // page 2 → offset 50  (messages 51-100)
        // page 3 → offset 100 (messages 101-150)
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // STEP 5 — fetch messages
        const [messages] = await db.query(
            `SELECT
                m.id,
                m.conversation_id,
                m.sender_id,
                m.receiver_id,
                m.message,
                m.message_type,
                m.is_read,
                m.created_at,
                u.full_name AS sender_name,
                u.profile_image AS sender_image
            FROM chat_messages m
            LEFT JOIN user_signup u ON m.sender_id = u.user_id
            WHERE m.conversation_id = ?
            AND NOT (m.sender_id = ? AND m.is_deleted_by_sender = 'yes')
            AND NOT (m.receiver_id = ? AND m.is_deleted_by_receiver = 'yes')
            ORDER BY m.created_at ASC
            LIMIT ? OFFSET ?`,
            [
                conversation_id,
                user_id,
                user_id,
                parseInt(limit),
                offset
            ]
        );

        // STEP 6 — auto mark messages as read
        // when user opens conversation all unread messages become read
        await db.query(
            `UPDATE chat_messages
             SET is_read = 'yes'
             WHERE conversation_id = ?
             AND receiver_id = ?
             AND is_read = 'no'`,
            [conversation_id, user_id]
        );

        // STEP 7 — send response with pagination info
        return res.status(200).json({
            success: true,
            message: "Messages fetched successfully",
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: messages.length,
            },
            data: messages,
        });

    } catch (error) {
        console.error("getMessages error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// ─────────────────────────────────────────────
// POST /api/chat/message/send
// Send a message via REST API
// Body: { conversation_id, sender_id, receiver_id, message }
// ─────────────────────────────────────────────
const sendMessage = async (req, res) => {
    try {

        // STEP 1 — read all fields from request body
        const {
            conversation_id,
            sender_id,
            receiver_id,
            message,
            message_type,
        } = req.body;

        // STEP 2 — validate all required fields
        if (!conversation_id || !sender_id || !receiver_id || !message) {
            return res.status(400).json({
                success: false,
                message: "conversation_id, sender_id, receiver_id and message are required",
            });
        }

        // STEP 3 — verify conversation exists
        // AND the sender is actually part of it
        const [conv] = await db.query(
            `SELECT * FROM chat_conversations
             WHERE conversation_id = ?
             AND (user_one_id = ? OR user_two_id = ?)`,
            [conversation_id, sender_id, sender_id]
        );

        if (conv.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found or access denied",
            });
        }

        // STEP 4 — insert the message into chat_messages
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

        // STEP 5 — update last_message preview in chat_conversations
        // This is what shows in the inbox screen
        await db.query(
            `UPDATE chat_conversations
             SET last_message = ?,
                 last_message_at = CURRENT_TIMESTAMP
             WHERE conversation_id = ?`,
            [message.substring(0, 100), conversation_id]
        );

        // STEP 6 — fetch the saved message with sender details
        // We fetch it back so we return complete data to the client
        const [savedMessage] = await db.query(
            `SELECT
                m.id,
                m.conversation_id,
                m.sender_id,
                m.receiver_id,
                m.message,
                m.message_type,
                m.is_read,
                m.created_at,
                u.full_name AS sender_name,
                u.profile_image AS sender_image
             FROM chat_messages m
             LEFT JOIN user_signup u ON m.sender_id = u.user_id
             WHERE m.id = ?`,
            [result.insertId]
        );

        return res.status(201).json({
            success: true,
            message: "Message sent successfully",
            data: savedMessage[0],
        });

    } catch (error) {
        console.error("sendMessage error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


// ─────────────────────────────────────────────
// DELETE /api/chat/message/:message_id
// Soft delete a message for one user only
// Query param: ?user_id=xxx
// ─────────────────────────────────────────────
const deleteMessage = async (req, res) => {
    try {

        // STEP 1 — get message_id from URL, user_id from query param
        const { message_id } = req.params;
        const { user_id } = req.query;

        // STEP 2 — user_id is required
        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: "user_id is required as query param",
            });
        }

        // STEP 3 — check message exists
        const [msg] = await db.query(
            "SELECT * FROM chat_messages WHERE id = ?",
            [message_id]
        );

        if (msg.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Message not found",
            });
        }

        const message = msg[0];

        // STEP 4 — only sender or receiver can delete
        if (message.sender_id !== user_id && message.receiver_id !== user_id) {
            return res.status(403).json({
                success: false,
                message: "Access denied — this is not your message",
            });
        }

        // STEP 5 — soft delete only for this specific user
        // never touch the other person's view
        if (message.sender_id === user_id) {
            await db.query(
                "UPDATE chat_messages SET is_deleted_by_sender = 'yes' WHERE id = ?",
                [message_id]
            );
        } else {
            await db.query(
                "UPDATE chat_messages SET is_deleted_by_receiver = 'yes' WHERE id = ?",
                [message_id]
            );
        }

        return res.status(200).json({
            success: true,
            message: "Message deleted successfully",
        });

    } catch (error) {
        console.error("deleteMessage error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// ─────────────────────────────────────────────
// GET /api/chat/unread/:user_id
// Get total unread message count for a user
// Used for notification badge on chat icon
// ─────────────────────────────────────────────
const getUnreadCount = async (req, res) => {
    try {
        const { user_id } = req.params;
 
        const [result] = await db.query(
            `SELECT COUNT(*) AS unread_count 
             FROM chat_messages 
             WHERE receiver_id = ? AND is_read = 'no'`,
            [user_id]
        );
 
        return res.status(200).json({
            success: true,
            message: "Unread count fetched",
            data: { unread_count: result[0].unread_count },
        });
    } catch (error) {
        console.error("getUnreadCount error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// ─────────────────────────────────────────────
// POST /api/chat/message/upload
// Upload image or file in chat
// Form-data: { conversation_id, sender_id, receiver_id, chat_file }
// Max size: 1MB (handled by uploadMiddleware)
// ─────────────────────────────────────────────
const uploadChatFile = async (req, res) => {
    try {

        // STEP 1 — check if file was actually uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded",
            });
        }

        // STEP 2 — read fields from body
        const { conversation_id, sender_id, receiver_id } = req.body;

        if (!conversation_id || !sender_id || !receiver_id) {
            return res.status(400).json({
                success: false,
                message: "conversation_id, sender_id and receiver_id are required",
            });
        }

        // STEP 3 — verify conversation exists and sender is part of it
        const [conv] = await db.query(
            `SELECT * FROM chat_conversations
             WHERE conversation_id = ?
             AND (user_one_id = ? OR user_two_id = ?)`,
            [conversation_id, sender_id, sender_id]
        );

        if (conv.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found or access denied",
            });
        }

        // STEP 4 — figure out message_type from file mimetype
        // image/jpeg, image/png → "image"
        // everything else → "file"
        const isImage = req.file.mimetype.startsWith("image/");
        const message_type = isImage ? "image" : "file";

        // STEP 5 — the file path stored in DB
        // frontend uses this to display or download
        const filePath = req.file.filename;

        // STEP 6 — save as a message in chat_messages
        const [result] = await db.query(
            `INSERT INTO chat_messages
             (conversation_id, sender_id, receiver_id, message, message_type)
             VALUES (?, ?, ?, ?, ?)`,
            [
                conversation_id,
                sender_id,
                receiver_id,
                filePath,       // message column stores the filename
                message_type,   // "image" or "file"
            ]
        );

        // STEP 7 — update last_message preview in conversation
        const previewText = isImage ? "📷 Image" : "📎 File";
        await db.query(
            `UPDATE chat_conversations
             SET last_message = ?,
                 last_message_at = CURRENT_TIMESTAMP
             WHERE conversation_id = ?`,
            [previewText, conversation_id]
        );

        // STEP 8 — fetch saved message with sender details
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

        return res.status(201).json({
            success: true,
            message: "File uploaded successfully",
            data: {
                ...savedMessage[0],
                file_url: `uploads/chat/${filePath}`,
            },
        });

    } catch (error) {
        console.error("uploadChatFile error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

module.exports = {
    getChatUsers,
    startConversation,
    getUserConversations,
    uploadChatFile,
    getMessages,
    sendMessage,
    deleteMessage,
    getUnreadCount,
};