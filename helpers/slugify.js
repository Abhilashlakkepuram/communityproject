const slugify = require("slugify");

const createSlug = (text) => {

    return slugify(text, {
        lower: true,
        strict: true
    });

};

module.exports = createSlug;