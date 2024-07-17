let token = "";
let userId = 0;

async function login() {
  const url = 'https://01.kood.tech/api/auth/signin';
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(unescape(encodeURIComponent(username + ":" + password))),
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      document.getElementById("loginError").innerHTML = error.error;
      return;
    }

    const data = await response.json();
    token = data;
    document.cookie = "token=" + data;
    getProfile();
  } catch (error) {
    console.error('Error during login:', error);
    document.getElementById("loginError").innerHTML = 'An error occurred during login.';
  }
}

function getTokenCookie() {
  const name = "token=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

document.getElementById('logoutButton').addEventListener('click', logOut);
document.addEventListener("DOMContentLoaded", () => {
  token = getTokenCookie();
  if (token !== "") {
    getProfile();
  }
});

function logOut() {
  document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
  location.reload();
}
