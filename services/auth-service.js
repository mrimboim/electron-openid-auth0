const { jwtDecode } = require("jwt-decode");
const axios = require("axios");
const url = require("url");
const envVariables = require("../env-variables");
const os = require("os");
const settings = require("electron-settings");
const { safeStorage } = require("electron");

const { apiIdentifier, auth0Domain, clientId, DESCOPE_PROJECT_ID } =
  envVariables;

const redirectUri = "electron://auth/";

let accessToken = null;
let profile = null;
let refreshToken = null;
let id_token = null;

let codeVerifier = null;

async function storeToken(token_name, token) {
  const encrypted_token = safeStorage.encryptString(token);
  await settings.set(token_name, encrypted_token);
  console.log(`Token ${token_name} stored successfully.`);
}

async function getStored(token_name) {
  const token = await settings.get(token_name);
  const decrypted_token = safeStorage.decryptString(Buffer.from(token.data));
  console.log(`Token ${token_name} retrieved and decrypted.`);
  return decrypted_token;
}

function getAccessToken() {
  console.log("Access token requested.");
  return accessToken;
}

async function getProfile() {
  console.log("Fetching user profile...");
  const refreshToken = await getStored("refresh");

  if (refreshToken) {
    console.log("Refresh token found. Fetching profile...");
    const options = {
      method: "GET",
      url: `https://api.descope.com/v1/auth/me`,
      headers: {
        Authorization: `Bearer ${DESCOPE_PROJECT_ID}:${refreshToken}`,
      },
    };

    try{
    const response = await axios(options);

    const name = response.data.name;
    const picture = response.data.picture;
    const profileInfo = { name: name, picture: picture };
    console.log("Profile fetched successfully:", profileInfo);
    return profileInfo;
    }catch(error){
      console.error("Error during get profile axios:", error.response.data, error.config);
      return null;
    }

  } else {
    console.error("No available refresh token in getProfile.");
  }
}

async function refreshTokens() {
  console.log("Refreshing tokens...");
  const refreshToken = await getStored("refresh");

  if (refreshToken) {
    console.log("Refresh token found. Refreshing access token...");
    const refreshOptions = {
      method: "POST",
      url: `https://api.descope.com/v1/auth/refresh`,
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${DESCOPE_PROJECT_ID}:${refreshToken}`,
      },
      data: {},
    };

    try {
      const response = await axios(refreshOptions);
      accessToken = response.data.sessionJwt;
      await storeToken("access", accessToken);
      console.log("Access token refreshed successfully.");
    } catch (error) {
      console.error("Error during token refresh:", error.data.response, error.config);
      await logout();
      throw error;
    }
  } else {
    console.error("No available refresh token for refreshing tokens.");
    throw new Error("No available refresh token.");
  }
}

async function loadTokens(callbackURL) {
  console.log("Loading tokens from callback URL:", callbackURL);
  const urlParts = url.parse(callbackURL, true);
  const query = urlParts.query;
  const state = urlParts.state;

  let baseURL = "descript.auth-sample-app.com";

  const exchangeOptions = {
    grant_type: "authorization_code",
    client_id: DESCOPE_PROJECT_ID,
    redirect_uri: redirectUri,
    code: query.code,
    code_verifier: codeVerifier,
  };

  const options = {
    method: "POST",
    url: `https://${baseURL}/oauth2/v1/token`,
    headers: {
      "content-type": "application/json",
    },
    data: JSON.stringify(exchangeOptions),
  };

  try {
    const response = await axios(options);

    accessToken = response.data.access_token;
    id_token = response.data.id_token;
    refreshToken = response.data.refresh_token;
    console.log(`access:${accessToken} \nrefresh:${refreshToken}`);
    console.log("Tokens loaded successfully. Storing tokens...");
    await storeToken("refresh", refreshToken);
    await storeToken("access", accessToken);
  } catch (error) {
    console.error("Error during token exchange:", error.response.data, "\n" ,error.config);
    await logout();
    throw error;
  }
}

async function validateSession() {
  console.log("Validating session...");
  let baseURL = "descript.auth-sample-app.com";
  const exchangeOptions = {};

  const options = {
    method: "POST",
    url: `https://${baseURL}/v1/auth/validate`,
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${DESCOPE_PROJECT_ID}:${accessToken}`,
    },
    data: JSON.stringify(exchangeOptions),
  };

  try {
    const response = await axios(options);

    if (response.status === 200) {
      console.log("Session validated successfully.");
      return true;
    }
  } catch (error) {
    console.warn("Session validation failed. Attempting to refresh tokens...");
    try {
      await refreshTokens();
      console.log("Session refreshed successfully after validation failure.");
      return true;
    } catch (refreshError) {
      console.error(
        "Token refresh failed during session validation:",
        error.response.data, error.config
      );
      return false;
    }
  }

  console.log("Session validation failed. Returning false.");
  return false;
}

async function logout() {
  const refreshToken = await getStored("refresh");

  console.log("Logging out...");
  if (refreshToken) {
    let baseURL = "descript.auth-sample-app.com";
    const exchangeOptions = {};

    const options = {
      method: "POST",
      url: `https://${baseURL}/v1/auth/logoutall`,
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${DESCOPE_PROJECT_ID}:${refreshToken}`,
      },
      data: JSON.stringify(exchangeOptions),
    };

    try {
      await axios(options);
      console.log("Logout request sent successfully.");
    } catch (error) {
      console.error(
        "Logout failed, possibly due to invalid or missing refresh token:",
        error.response.data, error.config
      );
    }
  }
  console.log("Clearing stored tokens...");
  await storeToken("access", "");
  await storeToken("refresh", "");

  accessToken = null;
  profile = null;
  refreshToken = null;

  console.log("Logout completed.");
}

function generateCodeVerifier() {
  console.log("Generating code verifier...");
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const charactersLength = characters.length;

  for (let i = 0; i < 128; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  console.log("Code verifier generated:", result);
  return result;
}

function generateCodeChallenge(verifier) {
  console.log("Generating code challenge from verifier:", verifier);
  return crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(verifier))
    .then((arrayBuffer) => {
      const base64Url = btoa(
        String.fromCharCode(...new Uint8Array(arrayBuffer))
      )
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
      console.log("Code challenge generated:", base64Url);
      return base64Url;
    });
}

const getAuthenticationURL = async (flowParam) => {
  console.log("Generating authentication URL...");
  codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  let baseURL = "descript.auth-sample-app.com";
  if (DESCOPE_PROJECT_ID && DESCOPE_PROJECT_ID.length >= 32) {
    const localURL = DESCOPE_PROJECT_ID.substring(1, 5);
    baseURL = [baseURL.slice(0, 4), localURL, ".", baseURL.slice(4)].join("");
  }
  console.log("Here is flowParam:",flowParam)
  const authUrl = `https://${baseURL}/oauth2/v1/authorize?response_type=code&client_id=${DESCOPE_PROJECT_ID}&redirect_uri=${redirectUri}&scope=openid&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${codeVerifier}&login_hint=${flowParam}`;
  console.log("Authentication URL generated:", authUrl);
  return authUrl;
};

module.exports = {
  getAccessToken,
  getAuthenticationURL,
  getProfile,
  loadTokens,
  logout,
  refreshTokens,
  validateSession,
  getStored,
};
