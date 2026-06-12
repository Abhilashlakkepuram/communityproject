const db = require("../../../config/db");
const { uploadSingle } = require("../../../middlewares/uploadMiddleware");
// ─────────────────────────────────────────────
// SITE HEADER
// ─────────────────────────────────────────────

// GET /api/header
const getHeader = async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT * FROM site_header WHERE status = 'active' LIMIT 1"
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Header not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Header fetched successfully",
            data: rows[0],
        });
    } catch (error) {
        console.error("getHeader error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// POST /api/header
const createHeader = async (req, res) => {
    try {
        const {
            name,
            phone_number,
            email,
            website,
            location,
            google_location,
            address,
            description,
            copyright_text,
            status,
            created_by,
        } = req.body;

        // Handle uploaded files (multer puts them in req.files)
        const logo = req.files?.logo?.[0]?.filename || null;
        const footer_logo = req.files?.footer_logo?.[0]?.filename || null;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Name is required",
            });
        }

        const [result] = await db.query(
            `INSERT INTO site_header 
            (name, logo, footer_logo, phone_number, email, website, location,
             google_location, address, description, copyright_text, status, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name,
                logo,
                footer_logo,
                phone_number || null,
                email || null,
                website || null,
                location || null,
                google_location || null,
                address || null,
                description || null,
                copyright_text || null,
                status || "active",
                created_by || null,
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Header created successfully",
            data: { id: result.insertId },
        });
    } catch (error) {
        console.error("createHeader error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// PUT /api/header/:id
const updateHeader = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if record exists
        const [existing] = await db.query(
            "SELECT * FROM site_header WHERE id = ?",
            [id]
        );
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Header not found",
            });
        }

        const {
            name,
            phone_number,
            email,
            website,
            location,
            google_location,
            address,
            description,
            copyright_text,
            status,
            updated_by,
        } = req.body;

        // Use new file if uploaded, otherwise keep old value
        const logo =
            req.files?.logo?.[0]?.filename || existing[0].logo || null;
        const footer_logo =
            req.files?.footer_logo?.[0]?.filename ||
            existing[0].footer_logo ||
            null;

        await db.query(
            `UPDATE site_header SET
            name = ?, logo = ?, footer_logo = ?, phone_number = ?, email = ?,
            website = ?, location = ?, google_location = ?, address = ?,
            description = ?, copyright_text = ?, status = ?, updated_by = ?
            WHERE id = ?`,
            [
                name || existing[0].name,
                logo,
                footer_logo,
                phone_number ?? existing[0].phone_number,
                email ?? existing[0].email,
                website ?? existing[0].website,
                location ?? existing[0].location,
                google_location ?? existing[0].google_location,
                address ?? existing[0].address,
                description ?? existing[0].description,
                copyright_text ?? existing[0].copyright_text,
                status || existing[0].status,
                updated_by || null,
                id,
            ]
        );

        return res.status(200).json({
            success: true,
            message: "Header updated successfully",
        });
    } catch (error) {
        console.error("updateHeader error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// DELETE /api/header/:id  (soft delete — just sets status to inactive)
const deleteHeader = async (req, res) => {
    try {
        const { id } = req.params;

        const [existing] = await db.query(
            "SELECT id FROM site_header WHERE id = ?",
            [id]
        );
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Header not found",
            });
        }

        await db.query(
            "UPDATE site_header SET status = 'inactive' WHERE id = ?",
            [id]
        );

        return res.status(200).json({
            success: true,
            message: "Header deleted successfully",
        });
    } catch (error) {
        console.error("deleteHeader error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// ─────────────────────────────────────────────
// SOCIAL MEDIA LINKS
// ─────────────────────────────────────────────

// GET /api/header/social-media
const getSocialMediaLinks = async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT * FROM social_media_links WHERE status = 'active' ORDER BY link_order ASC"
        );

        return res.status(200).json({
            success: true,
            message: "Social media links fetched successfully",
            data: rows,
        });
    } catch (error) {
        console.error("getSocialMediaLinks error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// POST /api/header/social-media
const createSocialMediaLink = async (req, res) => {
    try {
        const { platform_name, platform_link, link_order, status, created_by } =
            req.body;

        const platform_icon = req.file?.filename || null;

        if (!platform_name) {
            return res.status(400).json({
                success: false,
                message: "Platform name is required",
            });
        }

        const [result] = await db.query(
            `INSERT INTO social_media_links
            (platform_name, platform_icon, platform_link, link_order, status, created_by)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                platform_name,
                platform_icon,
                platform_link || null,
                link_order || 0,
                status || "active",
                created_by || null,
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Social media link created successfully",
            data: { id: result.insertId },
        });
    } catch (error) {
        console.error("createSocialMediaLink error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// PUT /api/header/social-media/:id
const updateSocialMediaLink = async (req, res) => {
    try {
        const { id } = req.params;

        const [existing] = await db.query(
            "SELECT * FROM social_media_links WHERE id = ?",
            [id]
        );
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Social media link not found",
            });
        }

        const { platform_name, platform_link, link_order, status, updated_by } =
            req.body;

        const platform_icon =
            req.file?.filename || existing[0].platform_icon || null;

        await db.query(
            `UPDATE social_media_links SET
            platform_name = ?, platform_icon = ?, platform_link = ?,
            link_order = ?, status = ?, updated_by = ?
            WHERE id = ?`,
            [
                platform_name || existing[0].platform_name,
                platform_icon,
                platform_link ?? existing[0].platform_link,
                link_order ?? existing[0].link_order,
                status || existing[0].status,
                updated_by || null,
                id,
            ]
        );

        return res.status(200).json({
            success: true,
            message: "Social media link updated successfully",
        });
    } catch (error) {
        console.error("updateSocialMediaLink error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// DELETE /api/header/social-media/:id
const deleteSocialMediaLink = async (req, res) => {
    try {
        const { id } = req.params;

        const [existing] = await db.query(
            "SELECT id FROM social_media_links WHERE id = ?",
            [id]
        );
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Social media link not found",
            });
        }

        await db.query(
            "UPDATE social_media_links SET status = 'inactive' WHERE id = ?",
            [id]
        );

        return res.status(200).json({
            success: true,
            message: "Social media link deleted successfully",
        });
    } catch (error) {
        console.error("deleteSocialMediaLink error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// ─────────────────────────────────────────────
// FOOTER QUICK LINKS
// ─────────────────────────────────────────────

// GET /api/header/footer-links
const getFooterQuickLinks = async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT * FROM footer_quick_links WHERE status = 'active' ORDER BY link_order ASC"
        );

        return res.status(200).json({
            success: true,
            message: "Footer quick links fetched successfully",
            data: rows,
        });
    } catch (error) {
        console.error("getFooterQuickLinks error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// POST /api/header/footer-links
const createFooterQuickLink = async (req, res) => {
    try {
        const { link_name, link_url, link_order, status, created_by } =
            req.body;

        if (!link_name || !link_url) {
            return res.status(400).json({
                success: false,
                message: "Link name and link URL are required",
            });
        }

        const [result] = await db.query(
            `INSERT INTO footer_quick_links
            (link_name, link_url, link_order, status, created_by)
            VALUES (?, ?, ?, ?, ?)`,
            [
                link_name,
                link_url,
                link_order || 0,
                status || "active",
                created_by || null,
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Footer quick link created successfully",
            data: { id: result.insertId },
        });
    } catch (error) {
        console.error("createFooterQuickLink error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// PUT /api/header/footer-links/:id
const updateFooterQuickLink = async (req, res) => {
    try {
        const { id } = req.params;

        const [existing] = await db.query(
            "SELECT * FROM footer_quick_links WHERE id = ?",
            [id]
        );
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Footer quick link not found",
            });
        }

        const { link_name, link_url, link_order, status, updated_by } =
            req.body;

        await db.query(
            `UPDATE footer_quick_links SET
            link_name = ?, link_url = ?, link_order = ?, status = ?, updated_by = ?
            WHERE id = ?`,
            [
                link_name || existing[0].link_name,
                link_url || existing[0].link_url,
                link_order ?? existing[0].link_order,
                status || existing[0].status,
                updated_by || null,
                id,
            ]
        );

        return res.status(200).json({
            success: true,
            message: "Footer quick link updated successfully",
        });
    } catch (error) {
        console.error("updateFooterQuickLink error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// DELETE /api/header/footer-links/:id
const deleteFooterQuickLink = async (req, res) => {
    try {
        const { id } = req.params;

        const [existing] = await db.query(
            "SELECT id FROM footer_quick_links WHERE id = ?",
            [id]
        );
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Footer quick link not found",
            });
        }

        await db.query(
            "UPDATE footer_quick_links SET status = 'inactive' WHERE id = ?",
            [id]
        );

        return res.status(200).json({
            success: true,
            message: "Footer quick link deleted successfully",
        });
    } catch (error) {
        console.error("deleteFooterQuickLink error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

module.exports = {
    // site_header
    getHeader,
    createHeader,
    updateHeader,
    deleteHeader,
    // social_media_links
    getSocialMediaLinks,
    createSocialMediaLink,
    updateSocialMediaLink,
    deleteSocialMediaLink,
    // footer_quick_links
    getFooterQuickLinks,
    createFooterQuickLink,
    updateFooterQuickLink,
    deleteFooterQuickLink,
};