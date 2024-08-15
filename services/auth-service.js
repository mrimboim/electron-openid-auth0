const {jwtDecode} = require('jwt-decode');
const axios = require('axios');
const url = require('url');
const envVariables = require('../env-variables');
const keytar = require('keytar');
const os = require('os');

const {apiIdentifier, auth0Domain, clientId} = envVariables;

const redirectUri = 'electron://auth/';

const keytarService = 'electron-openid-oauth';
const keytarAccount = os.userInfo().username;
console.log("OS info", os.userInfo().username)


let accessToken = null;
let profile = null;
let refreshToken = null;

function getAccessToken() {
  return accessToken;
}

function getProfile() {
  return profile;
}

function getAuthenticationURL() {
  return (
    "https://" +
    auth0Domain +
    "/authorize?" +
    "scope=openid profile offline_access&" +
    "response_type=code&" +
    "client_id=" +
    clientId +
    "&" +
    "redirect_uri=" +
    redirectUri
  );
}

async function refreshTokens() {

  const refreshToken = await keytar.getPassword(keytarService, keytarAccount);

  if (refreshToken) {
    const refreshOptions = {
      method: 'POST',
      url: `https://${auth0Domain}/oauth/token`,
      headers: {'content-type': 'application/json'},
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
  // try {
  //   await keytar.setPassword(keytarService, keytarAccount, "lol");
  // } catch (error) {
  //   console.error('Failed to save token:', error);
  // }

  console.log("IN LOAD TOKEN WITH:",callbackURL)
  const urlParts = url.parse(callbackURL, true);
  const query = urlParts.query;
  console.log("code of query of url",query.code)

  const exchangeOptions = {
    'grant_type': 'authorization_code',
    'client_id': clientId,
    'client_secret':"559W5hMC18MsaRHOtR8RF_gsM-Z8kFG9XQafnDEvH1QE70pNZXzLMRZvuztTwgvH",
    'code': query.code,
    'redirect_uri': redirectUri,
  };

  const options = {
    method: 'POST',
    url: `https://${auth0Domain}/oauth/token`,
    headers: {
      'content-type': 'application/json'
    },
    data: JSON.stringify(exchangeOptions),
  };

  try {
    const response = await axios(options);

    accessToken = response.data.access_token;
    profile = jwtDecode(response.data.id_token);
    refreshToken = response.data.refresh_token;
    console.log("Access Token:", accessToken);
    console.log("Profile:", profile);
    console.log("Refresh Token:", refreshToken);

    if (refreshToken) {
      console.log("HOUSTON WE HAVE A TOKEN")
      
      try{
      await keytar.setPassword(keytarService, keytarAccount, refreshToken);
      }catch(error){
        console.error("Keytar Failed:", error)
      }

      console.log("after keyatr")
      const refreshTokenGot = await keytar.getPassword(keytarService, keytarAccount);
      console.log("refreshtokenfromkeytar:",refreshTokenGot)


    }
  } catch (error) {
    console.error("Error from Token part:",error,"\n")
    await logout();


    throw error;
  }
}

async function logout() {
  await keytar.deletePassword(keytarService, keytarAccount);
  accessToken = null;
  profile = null;
  refreshToken = null;
}

function getLogOutUrl() {
  return `https://${auth0Domain}/v2/logout`;
}

module.exports = {
  getAccessToken,
  getAuthenticationURL,
  getLogOutUrl,
  getProfile,
  loadTokens,
  logout,
  refreshTokens,
};