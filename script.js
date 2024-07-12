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

async function getProfile() {
  const url = 'https://01.kood.tech/api/graphql-engine/v1/graphql';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `{
          user {
            id
            login
          }
          transaction {
            type
            amount
            eventId
            createdAt
            path
          }
          event_user(where: { userId: { _eq: ${userId} }}) {
            eventId
            event {
              path
              createdAt
              endAt
            }
          }
        }`
      })
    });

    const data = await response.json();
    userId = data.data.user[0].id;
    document.getElementById("displayUser").innerHTML = data.data.user[0].login;
    fetchData();
  } catch (error) {
    console.error('Error fetching user ID:', error);
  }
}

async function fetchData() {
  const url = 'https://01.kood.tech/api/graphql-engine/v1/graphql';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `{
          user {
            login
          }
          transaction {
            type
            amount
            eventId
            createdAt
            path
          }
          event_user(where: { userId: { _eq: ${userId} }}) {
            eventId
            event {
              path
              createdAt
              endAt
            }
          }
        }`
      })
    });

    const data = await response.json();
    document.getElementById("login").style.display = "none";
    document.getElementById("main").style.display = "block";

    const { xpByProjectData, sortedTransactions } = await xpProject(token);
    showData(data.data, xpByProjectData, sortedTransactions);
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

async function xpProject(userToken, path = "div-01\\/[-\\\\w]+$") {
  const query = `
    query xpProject($type: String!) {
      transaction(
        where: {
          path: { _regex: "^\\/johvi\\/${path}" }
          type: { _eq: $type }
        },
        order_by: { amount: asc }
      ) {
        amount
        path
      }
    }
  `;

  const queryBody = {
    query,
    variables: {
      type: "xp",
    },
  };

  const response = await fetch('https://01.kood.tech/api/graphql-engine/v1/graphql', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + userToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(queryBody)
  });

  const results = await response.json();

  let pathStart;
  if (RegExp("piscine-js").test(path)) pathStart = "/johvi/div-01/piscine-js/";
  else if (RegExp("quest").test(path)) pathStart = "/johvi/piscine-go/";
  else if (RegExp("exam").test(path))
    pathStart = /^.*(deprecated-24-01-2024-|dummy-exam\/|exam-..\/)/;
  else pathStart = "/johvi/div-01/";

  const xpByProjectData = results.data.transaction.map((transaction) => {
    const updatedPath = transaction.path.replace(pathStart, "");
    return { ...transaction, path: updatedPath };
  });

  return { xpByProjectData, sortedTransactions: results.data.transaction };
}

function showData(data, xpByProjectData, sortedTransactions) {
  let eventId = 0;
  let eventStart = 0;
  for (let i of data.event_user) {
    if (i.event.path.endsWith("div-01")) {
      eventId = i.eventId;
      eventStart = Date.parse(i.event.createdAt);
      break;
    }
  }

  let xpChanges = [];
  let auditChanges = [];
  let xp = 0;
  let auditUp = 0;
  let auditDown = 0;
  for (let i of data.transaction) {
    if (i.eventId !== eventId) continue;
    if (i.type === "xp") {
      xp += i.amount;
      xpChanges.push(i);
    } else if (i.type === "up") {
      auditUp += i.amount;
      auditChanges.push(i);
    } else if (i.type === "down") {
      auditDown += i.amount;
      auditChanges.push(i);
    }
  }

  document.getElementById("xp").innerHTML = byteConversion(xp);
  document.getElementById("auditrecieved").innerHTML = byteConversion(auditDown);
  document.getElementById("auditdone").innerHTML = byteConversion(auditUp);
  document.getElementById("auditratio").innerHTML = (auditUp / auditDown).toFixed(2);

  xpGraph(eventStart, xp, xpChanges);
  pieChart(xpByProjectData);
}

function xpGraph(eventStart, xp, xpChanges) {
  xpChanges.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

  let maxXp = xp * 1.3;
  let end = Date.now();

  let sum = 0;
  let pathData = [];

  const xpGraph = document.getElementById("xpGraph");
  xpGraph.innerHTML = "";


  const startText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  startText.innerHTML = (new Date(eventStart)).toLocaleDateString('en-us', { year: "numeric", month: "short", day: "numeric" }) + " - 0 XP";
  startText.setAttribute("x", 24);
  startText.setAttribute("y", 240 - 12);
  startText.setAttribute("text-anchor", "start");
  startText.setAttribute("fill", "#555");
  startText.setAttribute("font-size", "12px");
  xpGraph.appendChild(startText);

  const endText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  endText.innerHTML = (new Date()).toLocaleDateString('en-us', { year: "numeric", month: "short", day: "numeric" }) + " - " + xp.toLocaleString() + " XP";
  endText.setAttribute("x", 400 - 24);
  endText.setAttribute("y", 24);
  endText.setAttribute("text-anchor", "end");
  endText.setAttribute("fill", "#555");
  endText.setAttribute("font-size", "12px");
  xpGraph.appendChild(endText);

  for (let i = 0; i < xpChanges.length; i++) {
    const change = xpChanges[i];
    const createdAt = Date.parse(change.createdAt);
    const relativeX = (createdAt - eventStart) / (end - eventStart);
    sum += change.amount;
    const relativeY = sum / maxXp;
    const x = relativeX * (400 - 48) + 24;
    const y = (1 - relativeY) * (240 - 48) + 24;

    pathData.push({ x, y });
  }

  const pathString = pathData.map(point => `${point.x},${point.y}`).join(' L');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', `M${pathString}`);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', '#007bff');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  xpGraph.appendChild(path);

  const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  xAxis.setAttribute('x1', 24);
  xAxis.setAttribute('y1', 240 - 24);
  xAxis.setAttribute('x2', 400 - 24);
  xAxis.setAttribute('y2', 240 - 24);
  xAxis.setAttribute('stroke', '#aaa');
  xAxis.setAttribute('stroke-width', '2');
  xpGraph.appendChild(xAxis);

  const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  yAxis.setAttribute('x1', 24);
  yAxis.setAttribute('y1', 24);
  yAxis.setAttribute('x2', 24);
  yAxis.setAttribute('y2', 240 - 24);
  yAxis.setAttribute('stroke', '#aaa');
  yAxis.setAttribute('stroke-width', '2');
  xpGraph.appendChild(yAxis);

  const xAxisLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  xAxisLabel.innerHTML = 'Time';
  xAxisLabel.setAttribute('x', 400 / 2);
  xAxisLabel.setAttribute('y', 240 - 4);
  xAxisLabel.setAttribute('text-anchor', 'middle');
  xAxisLabel.setAttribute('fill', '#555');
  xAxisLabel.setAttribute('font-size', '14px');
  xpGraph.appendChild(xAxisLabel);

  const yAxisLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  yAxisLabel.innerHTML = 'XP';
  yAxisLabel.setAttribute('x', 16);
  yAxisLabel.setAttribute('y', 240 / 2);
  yAxisLabel.setAttribute('transform', 'rotate(-90, 16, ' + (240 / 2) + ')');
  yAxisLabel.setAttribute('text-anchor', 'middle');
  yAxisLabel.setAttribute('fill', '#555');
  yAxisLabel.setAttribute('font-size', '14px');
  xpGraph.appendChild(yAxisLabel);
}

function pieChart(xpByProjectData) {
  let projects = xpByProjectData.map(transaction => transaction.path);
  let amounts = xpByProjectData.map(transaction => transaction.amount);

  var ctx = document.getElementById('projectPieChart').getContext('2d');
  var myPieChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: projects,
      datasets: [{
        label: 'XP by Project',
        data: amounts,
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#8BC34A',
          '#9C27B0',
          '#FF9800'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      legend: {
        position: 'right'
      }
    }
  });
}
function byteConversion(num) {
  const bytes = ['bytes', 'KB', 'MB', 'GB', 'TB']; 
  let divisions = 0;
  if (num === 0) {
    return '0 bytes';
  }
  while (num >= 1000 && divisions < bytes.length - 1) {
    num /= 1000;
    divisions++;
  }
  let decimals = 2;
  if (Math.abs(num) >= 100) {
    decimals = 0;
  } else if (Math.abs(num) >= 10) {
    decimals = 1;
  }
  const formattedNum = num.toFixed(decimals);
  return `${formattedNum} ${bytes[divisions]}`;
}

function logOut() {
  document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
  location.reload();
}

document.getElementById('logoutButton').addEventListener('click', logOut);
document.addEventListener("DOMContentLoaded", () => {
  token = getTokenCookie();
  if (token !== "") {
    getProfile();
  }
});
