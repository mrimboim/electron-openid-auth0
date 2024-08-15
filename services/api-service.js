const axios = require('axios');
const authService = require('./auth-service');
// Once access token is all good uses it to call a private api (not super neccesary we can instead check experiation of acces token like in oidc sample app)
async function getPrivateData() {
  const result = await axios.get('http://localhost:3000/private', {
    headers: {
      'Authorization': `Bearer ${authService.getAccessToken()}`,
    },
  });
  return result.data;
}

module.exports = {
  getPrivateData,
}