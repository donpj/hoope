const express = require("express");
const axios = require("axios");
const https = require("https");
const fs = require("fs");
const path = require("path");
const app = express();
require("dotenv").config();

app.use(express.json());

const PORT = process.env.PORT || 3000;

// Update these paths to match your project structure
const CERT_PATH = path.resolve(__dirname, "certs/transport.pem");
const KEY_PATH = path.resolve(__dirname, "certs/private.key");

app.get("/revolut-callback", (req, res) => {
  const { code, state } = req.query;

  // Validate state if you're using it for CSRF protection

  // Redirect to your app with the authorization code
  const redirectUri = `hoopemvp://revolut-callback?code=${code}`;

  // Redirect to the app
  res.redirect(redirectUri);
});

app.post("/revolut-exchange-token", async (req, res) => {
  const { authCode } = req.body;

  try {
    const privateKey = fs.readFileSync(KEY_PATH);
    const cert = fs.readFileSync(CERT_PATH);

    const response = await axios.post(
      `${process.env.REVOLUT_HOST}/token`,
      new URLSearchParams({
        grant_type: "authorization_code",
        code: authCode,
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        httpsAgent: new https.Agent({
          key: privateKey,
          cert: cert,
        }),
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    res.status(500).json({ error: "Failed to exchange code for token" });
  }
});

app.get("/revolut-get-accounts", async (req, res) => {
  const accessToken = req.headers.authorization?.split(" ")[1];

  if (!accessToken) {
    return res.status(401).json({ error: "No access token provided" });
  }

  try {
    const response = await axios.get(`${process.env.REVOLUT_URL}/accounts`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-fapi-financial-id": "001580000103UAvAAM",
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error getting accounts:", error);
    res.status(500).json({ error: "Failed to get accounts" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
