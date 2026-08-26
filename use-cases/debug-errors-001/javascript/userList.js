// userList.js
function renderUserList(users) {
  const userListElement = document.getElementById('user-list');
  userListElement.innerHTML = '';

  // Loop through users, up to a maximum of 5.
  // BUG FIX: the original `for (let i = 0; i < 5; i++)` always iterated to 5 even when
  // fewer users existed, so `users[i]` was `undefined` on the last iterations and
  // `user.name` threw a "Cannot read properties of undefined" (index-out-of-bounds) error.
  // We now bound the loop by the actual number of users.
  const count = Math.min(users.length, 5);
  for (let i = 0; i < count; i++) {
    const user = users[i];

    const userName = user.name;
    const userEmail = user.email;

    const userElement = document.createElement('div');
    userElement.innerHTML = `
      <div class="user-card">
        <h3>${userName}</h3>
        <p>${userEmail}</p>
      </div>
    `;

    userListElement.appendChild(userElement);
  }
}

// dashboard.js
function loadDashboard() {
  renderUserList(sampleResponse.users);

}

// Sample data from API
const sampleResponse = {
  users: [
    { name: "John Doe", email: "john@example.com" },
    { name: "Jane Smith", email: "jane@example.com" },
    { name: "Bob Johnson", email: "bob@example.com" }
  ]
};

// Export the loadDashboard function for testing
module.exports = {
  loadDashboard
};
