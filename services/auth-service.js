const { jwtDecode } = require('jwt-decode');
const axios = require('axios');
const url = require('url');
const envVariables = require('../env-variables');
const keytar = require('keytar');
const os = require('os');
const settings = require('electron-settings');
const {safeStorage} = require('electron')


const { apiIdentifier, auth0Domain, clientId, DESCOPE_PROJECT_ID } = envVariables;

const redirectUri = 'electron://auth/';

let accessToken = null;
let profile = null;
let refreshToken = null;
let id_token = null;

let codeVerifier = null;


async function storeToken(token_name, token) {

  console.log("\n Encryption Available:", safeStorage.isEncryptionAvailable());
  encrypted_token = safeStorage.encryptString(token);
  await settings.set(token_name,encrypted_token);

}

async function getStored(token_name) {
  const token = await settings.get(token_name);
  decrypted_token = safeStorage.decryptString(Buffer.from(token.data))
  return decrypted_token
}

function getAccessToken() {
  return accessToken;
}

async function getProfile() {
  while (!refreshToken) {
  }
  const options = {
    method: 'GET',
    url: `https://api.descope.com/v1/auth/me`,
    headers: {
      'Authorization': `Bearer ${DESCOPE_PROJECT_ID}:${refreshToken}`
    },
  };
  const response = await axios(options);


  const name = response.data.name
  const picture = response.data.picture
  profileInfo = { name: name, picture: picture }
  return profileInfo
}

async function getAuthenticationURL() {
  const auth_url = await getAuthUrl();
  return auth_url
}

async function refreshTokens() {

  const refreshToken = await keytar.getPassword(keytarService, keytarAccount);

  if (refreshToken) {
    const refreshOptions = {
      method: 'POST',
      url: `https://${auth0Domain}/oauth/token`,
      headers: { 'content-type': 'application/json' },
      data: {
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: refreshToken,
      }
    };

    try {
      const response = await axios(refreshOptions);

      accessToken = response.data.access_token;
      profile = jwtDecode(response.data.id_token);
    } catch (error) {
      await logout();

      throw error;
    }
  } else {
    throw new Error("No available refresh token.");
  }
}

async function loadTokens(callbackURL) {

  const urlParts = url.parse(callbackURL, true);
  const query = urlParts.query;
  const state = urlParts.state;

  let baseURL = "descript.auth-sample-app.com"
  
  const exchangeOptions = {
    'grant_type': 'authorization_code',
    'client_id': DESCOPE_PROJECT_ID,
    'redirect_uri': redirectUri,
    'code': query.code,
    'code_verifier': codeVerifier
  };

  const options = {
    method: 'POST',
    url: `https://${baseURL}/oauth2/v1/token`,
    headers: {
      'content-type': 'application/json'
    },
    data: JSON.stringify(exchangeOptions),
  };

  try {
    const response = await axios(options);

    accessToken = response.data.access_token;
    id_token = response.data.id_token;
    refreshToken = response.data.refresh_token;

    await storeToken("refresh",refreshToken)
    await storeToken("access", accessToken)
    
  } catch (error) {
    console.error("Error from Token part:", error, "\n")
    await logout();


    throw error;
  }
}
async function validateSession() {
  let baseURL = "descript.auth-sample-app.com";
  const exchangeOptions = {};

  const options = {
    method: 'POST',
    url: `https://${baseURL}/v1/auth/validate`,
    headers: {
      'content-type': 'application/json',
      'Authorization': `Bearer ${DESCOPE_PROJECT_ID}:${accessToken}`,
    },
    data: JSON.stringify(exchangeOptions),
  };

  try {
    const response = await axios(options);

    // Check if the response status is 200
    if (response.status === 200) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Error from Token part:", error);
    return false;

    // Return false if there's an error or the status is not 200
  }
}

async function logout() {
  let baseURL = "descript.auth-sample-app.com"
  const exchangeOptions = {
  };

  const options = {
    method: 'POST',
    url: `https://${baseURL}/v1/auth/logoutall`,
    headers: {
      'content-type': 'application/json',
      'Authorization': `Bearer ${DESCOPE_PROJECT_ID}:${refreshToken}`

    },
    data: JSON.stringify(exchangeOptions),
  };

  try {
    const response = await axios(options);
    
    await storeToken("access","")
    await storeToken("refresh","")

    accessToken = null;
    profile = null;
    refreshToken = null;

  } catch (error) {
    console.error("Error from Token part:", error, "\n")
    await logout();


    throw error;
  }


 
}

// TODO: erase and remove since we use the api to logout 
function getLogOutUrl() {


  // return `https://api.descope.com/oauth2/v1/logout?id_token_hint=${id_token}`;
  return `https://google.com`;

}


function generateCodeVerifier() {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const charactersLength = characters.length;

  for (let i = 0; i < 128; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}



function generateCodeChallenge(verifier) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
    .then(arrayBuffer => {
      const base64Url = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
      return base64Url;
    });
}


const getAuthUrl = async () => {
  codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  let baseURL = "descript.auth-sample-app.com"
  if (DESCOPE_PROJECT_ID && DESCOPE_PROJECT_ID.length >= 32) {
    const localURL = DESCOPE_PROJECT_ID.substring(1, 5)
    baseURL = [baseURL.slice(0, 4), localURL, ".", baseURL.slice(4)].join('')
  }


  const authUrl = `https://${baseURL}/oauth2/v1/authorize?response_type=code&client_id=${DESCOPE_PROJECT_ID}&redirect_uri=${redirectUri}&scope=openid&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${codeVerifier}`;
  // console.log(authUrl);

  return authUrl;
}


module.exports = {
  getAccessToken,
  getAuthenticationURL,
  getLogOutUrl,
  getProfile,
  loadTokens,
  logout,
  refreshTokens,
  validateSession,
  getStored
};

