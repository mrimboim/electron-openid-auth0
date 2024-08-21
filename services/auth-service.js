const { jwtDecode } = require('jwt-decode');
const axios = require('axios');
const url = require('url');
const envVariables = require('../env-variables');
const keytar = require('keytar');
const os = require('os');
const settings = require('electron-settings');
const electron = require('electron')


const { apiIdentifier, auth0Domain, clientId, DESCOPE_PROJECT_ID } = envVariables;

const redirectUri = 'electron://auth/';

const keytarService = 'electron-openid-oauth';
const keytarAccount = os.userInfo().username;
// console.log("OS info", os.userInfo().username)


let accessToken = null;
let profile = null;
let refreshToken = null;
let id_token = null;

let codeVerifier = null;

// async function setRefresh(token){
//   console.log("\n IS ENCRYPTION AVAILABLE:",electron.safeStorage.isEncryptionAvailable())
//   encrypted_Refresh = electron.safeStorage.encryptString('AppleSnappleMapple')

//   try{
//     await settings.set('DSR', encrypted_Refresh);
//   }catch(error){
//     console.log(`\nError from setRefresh:${error}\n`)
//   }

// }
// async function getRefresh(){
//   const token = await settings.get('DSR')
//   console.log("TOKEN FROM GET REFRESH:",token)
//   console.log("Decrypted Token:",electron.safeStorage.decryptString(token))

// }
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

  // console.log("\n @@@ME@@@: \n",response,"\n")
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
  // await setRefresh();
  // await getRefresh();
  // try {
  //   await keytar.setPassword(keytarService, keytarAccount, "lol");
  // } catch (error) {
  //   console.log('\nFailed to save token:', error);
  // }

  // try {
  //   const test = await keytar.getPassword(keytarService, keytarAccount);
  //   console.log(`Test from keytar value:${test}`)
  // } catch (error) {
  //   console.log('\n Failed to get saved keychain token:', error)
  // }


  // console.log("IN LOAD TOKEN WITH:",callbackURL)
  const urlParts = url.parse(callbackURL, true);
  const query = urlParts.query;
  const state = urlParts.state;
  // console.log("code of query of url",query.code)
  // console.log("state of query of url",query.state)


  let baseURL = "descript.auth-sample-app.com"
  // const codeVerifier = generateCodeVerifier();
  // const codeChallenge = await generateCodeChallenge(codeVerifier);
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
    // console.log("\n _____RESPONSE____-_-_-___ \n",response,"\n")

    accessToken = response.data.access_token;
    id_token = response.data.id_token;
    refreshToken = response.data.refresh_token;
    // console.log("Access Token:", accessToken);
    // console.log("Profile:", profile);
    // console.log("Refresh Token:", refreshToken);

    // #TODO: switch keytar for safe storage
    // if (refreshToken) {
    //   console.log("HOUSTON WE HAVE A TOKEN")

    //   try{
    //   await keytar.setPassword(keytarService, keytarAccount, refreshToken);
    //   }catch(error){
    //     console.error("Keytar Failed:", error)
    //   }

    //   console.log("after keyatr")
    //   const refreshTokenGot = await keytar.getPassword(keytarService, keytarAccount);
    //   console.log("refreshtokenfromkeytar:",refreshTokenGot)


    // }
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
  // #TODO: Swithc keytar out for safe storage
  // try{
  //   await keytar.deletePassword(keytarService, keytarAccount);
  // }catch(error){
  //   print("KEYTAR NOT WORK LOGOUT")
  // }
  let baseURL = "descript.auth-sample-app.com"
  // const codeVerifier = generateCodeVerifier();
  // const codeChallenge = await generateCodeChallenge(codeVerifier);
  const exchangeOptions = {
  };

  const options = {
    method: 'POST',
    url: `https://${baseURL}/v1/auth/logoutall`,
    headers: {
      'content-type': 'application/json',
      'Authorization': `Bearer ${DESCOPE_PROJECT_ID}:${refresh_token}`

    },
    data: JSON.stringify(exchangeOptions),
  };

  try {
    const response = await axios(options);
    // console.log("\n _____RESPONSE____-_-_-___ \n",response,"\n")

  } catch (error) {
    console.error("Error from Token part:", error, "\n")
    await logout();


    throw error;
  }


  accessToken = null;
  profile = null;
  refreshToken = null;
}

function getLogOutUrl() {


  return `https://api.descope.com/oauth2/v1/logout?id_token_hint=${id_token}`;
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
  validateSession
};

