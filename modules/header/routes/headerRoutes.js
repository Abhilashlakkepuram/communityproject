const express = require("express");
const router = express.Router();

const {
    getHeader,
    createHeader,
    updateHeader,
    deleteHeader,
    getSocialMediaLinks,
    createSocialMediaLink,
    updateSocialMediaLink,
    deleteSocialMediaLink,
    getFooterQuickLinks,
    createFooterQuickLink,
    updateFooterQuickLink,
    deleteFooterQuickLink,
} = require("../controller/headerController");

const { uploadFields, uploadSingle } = require("../../../middlewares/uploadMiddleware");

// ─────────────────────────────────────────────
// SITE HEADER ROUTES
// /api/header
// ─────────────────────────────────────────────

router.get("/", getHeader);

// uploadFields handles multiple named file fields (logo + footer_logo)
router.post("/", uploadFields([{ name: "logo", maxCount: 1 }, { name: "footer_logo", maxCount: 1 }]), createHeader);
router.put("/:id", uploadFields([{ name: "logo", maxCount: 1 }, { name: "footer_logo", maxCount: 1 }]), updateHeader);
router.delete("/:id", deleteHeader);

// ─────────────────────────────────────────────
// SOCIAL MEDIA LINKS ROUTES
// /api/header/social-media
// ─────────────────────────────────────────────

router.get("/social-media", getSocialMediaLinks);
router.post("/social-media", uploadSingle("platform_icon"), createSocialMediaLink);
router.put("/social-media/:id", uploadSingle("platform_icon"), updateSocialMediaLink);
router.delete("/social-media/:id", deleteSocialMediaLink);

// ─────────────────────────────────────────────
// FOOTER QUICK LINKS ROUTES
// /api/header/footer-links
// ─────────────────────────────────────────────

router.get("/footer-links", getFooterQuickLinks);
router.post("/footer-links", createFooterQuickLink);
router.put("/footer-links/:id", updateFooterQuickLink);
router.delete("/footer-links/:id", deleteFooterQuickLink);

module.exports = router;