// userList.test.js
const { loadDashboard } = require('../userList');
describe('Dashboard', () => {
  beforeEach(() => {
    // Setup a mock DOM environment
    document.body.innerHTML = '<div id="user-list"></div>';
  });

  test('loadDashboard should render user list correctly', () => {
    // Call the function
    loadDashboard();

    // Verify the results
    const userCards = document.querySelectorAll('.user-card');
    // Sample data contains 3 users and the loop is capped at 5, so 3 cards are rendered.
    expect(userCards.length).toBe(3);

    // Check if the first user is rendered correctly
    expect(userCards[0].querySelector('h3').textContent).toBe('John Doe');
    expect(userCards[0].querySelector('p').textContent).toBe('john@example.com');
  });
});
