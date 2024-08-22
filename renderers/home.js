addEventListener('load',async  () =>{
  const valid = await window.electronAPI.validate();
  if(valid){
  const profile = await window.electronAPI.getProfile();
  // console.log("PROFILE FROM INSIDE HOME.js:",profile)
  document.getElementById('picture').src = profile.picture;
  document.getElementById('name').innerText = profile.name;
  document.getElementById('success').innerText = 'You successfully used OpenID Connect and OAuth 2.0 to authenticate.';
  }
});

document.getElementById('logout').onclick = () => {
  window.electronAPI.logOut();
};
