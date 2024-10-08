const { createRequestHandler } = require("@expo/server/adapter/netlify");

const handler = createRequestHandler({
    build: require("path").join(__dirname, "../../dist/server"),
});

module.exports = { handler };
