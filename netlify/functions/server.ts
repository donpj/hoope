const { createRequestHandler } = require("@expo/server/adapter/netlify");

console.log("Netlify function starting");
console.log("Environment variables:");
console.log("REVOLUT_HOST:", process.env.REVOLUT_HOST);
console.log("REVOLUT_URL:", process.env.REVOLUT_URL);
console.log("REVOLUT_JWKS_URL:", process.env.REVOLUT_JWKS_URL);
console.log("REVOLUT_REDIRECT_URI:", process.env.REVOLUT_REDIRECT_URI);
console.log("REVOLUT_API_URL:", process.env.REVOLUT_API_URL);

const handler = createRequestHandler({
    build: require("path").join(__dirname, "../../dist/server"),
});

exports.handler = async (event, context) => {
    console.log("Received request:", event.path, event.httpMethod);
    return handler(event, context);
};
