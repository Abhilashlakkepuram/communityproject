const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ─────────────────────────────────────────────
// STORAGE CONFIGURATION
// Files saved to: uploads/<folder>/<timestamp>-<originalname>
// ─────────────────────────────────────────────

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Each field name maps to its own sub-folder inside /uploads
        const folderMap = {
            logo: "header",
            footer_logo: "header",
            platform_icon: "social-media",
            chat_file: "chat", 
        };

        const folder = folderMap[file.fieldname] || "general";
        const uploadPath = path.join("uploads", folder);

        // Create folder if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },

    filename: (req, file, cb) => {
        // e.g. logo-1716800000000.png  — clean and unique
        const prefix = file.fieldname;
        const ext = path.extname(file.originalname);
        const uniqueName = `${prefix}-${Date.now()}${ext}`;
        cb(null, uniqueName);
    },
});

// ─────────────────────────────────────────────
// FILE FILTER — only allow images
// ─────────────────────────────────────────────

// AFTER — images + documents
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg|pdf|doc|docx|xls|xlsx|txt/;
    const extValid = allowedTypes.test(
        path.extname(file.originalname).toLowerCase()
    );
    const mimeValid = allowedTypes.test(file.mimetype);

    if (extValid && mimeValid) {
        cb(null, true);
    } else {
        cb(new Error("Only image files are allowed (jpeg, jpg, png, gif, webp, svg)"));
    }
};

// ─────────────────────────────────────────────
// MULTER INSTANCE
// ─────────────────────────────────────────────

const upload = multer({
    storage,
    fileFilter,
    // limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    limits: { fileSize: 1 * 1024 * 1024 }, // 1MB max
});

// ─────────────────────────────────────────────
// EXPORTED HELPERS
// ─────────────────────────────────────────────

// For routes that upload a SINGLE file
// Usage: uploadSingle("logo")
const uploadSingle = (fieldName) => upload.single(fieldName);

// For routes that upload MULTIPLE different named files
// Usage: uploadFields([{ name: "logo", maxCount: 1 }, { name: "footer_logo", maxCount: 1 }])
const uploadFields = (fields) => upload.fields(fields);

// For routes that upload multiple files under the SAME field name
// Usage: uploadArray("images", 5)
const uploadArray = (fieldName, maxCount) =>
    upload.array(fieldName, maxCount);

module.exports = { uploadSingle, uploadFields, uploadArray };