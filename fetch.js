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
