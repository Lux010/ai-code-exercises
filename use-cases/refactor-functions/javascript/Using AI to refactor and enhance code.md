# Assessment — Using AI to refactor and enhance code

**Lesson principle discovered:** *Know your words* — to direct AI well (and learn from it) we must
know the jargon: refactoring, decomposition, single responsibility, design patterns, readability.
**Approach:** AI as a *guide/reviewer*, not an auto-applier. Each part below (a) states the
prompt template, (b) simulates the AI's analysis of the code, (c) shows the improved version,
(d) notes what I learned. The exercise explicitly says **no runnable code/tests required** — this
is comparison + documented insight (though parts are also grounded in the repo's real
`user_validator.js`).

---

# Exercise 1 — Understanding What to Change with AI (3 examples)

## Example 1 — Code Readability Improvement (Java: UserMgr)

**Prompt used (Prompt 1: Code Readability Improvement), Java + standard naming:**
```
I want to make this code more readable and maintainable. Please:
1. Identify parts that are difficult to understand
2. Suggest better variable/function names
3. Recommend how to break down complex sections
4. Point out inconsistent style/formatting
[UserMgr code]  Language: Java, standards: classes PascalCase, methods camelCase.
```

**AI findings (simulated):**
- `u_list`, `db`, `a`, `f`, `U`, `un`, `pw`, `em`, `nu`, `res` are all cryptic.
- `a(...)` does *three* things: validates input, checks for duplicate username, and persists —
  and the short-password check (`< 8`) is a magic number.
- **Security flag (I'd have missed this):** `db.execute("INSERT INTO users VALUES ('" + un + "', '" + pw + "', '" + em + "')")` is a **SQL-injection vulnerability** — string-built SQL.
- The class mixes persistence (`DBConn`) with domain logic.

**Before to After (key renames + docs):**
```java
class UserManager {
    private List<User> users;
    private DatabaseConnection database;

    public UserManager(DatabaseConnection db) {
        this.database = db;
        this.users = new ArrayList<>();
    }

    /** Registers a new user after validating input and uniqueness. Returns true on success. */
    public boolean registerUser(String username, String password, String email) {
        if (username.length() < MIN_USERNAME_LENGTH      // 3
         || password.length() < MIN_PASSWORD_LENGTH      // 8
         || !email.contains("@")) {
            return false;
        }
        for (User user : users) {
            if (user.getUsername().equals(username)) return false;   // duplicate
        }
        User newUser = new User(username, password, email);
        users.add(newUser);
        // NOTE: use a parameterized query, not string concatenation (SQL-injection safe)
        return database.execute(
            "INSERT INTO users (username, password, email) VALUES (?, ?, ?)",
            username, password, email);
    }

    public User findUserByUsername(String username) {
        for (User user : users) {
            if (user.getUsername().equals(username)) return user;
        }
        return null;
    }
}
class User { /* renamed U; getUn()->getUsername(), etc. */ }
```

**Readability issues the AI caught that I might have missed:** the SQL-injection bug, and that
`a()` silently mixes three responsibilities — not just "bad names."

<!-- ENDCHUNK1 -->

## Example 2 — Function Refactoring (Python: process_orders)

**Prompt used (Prompt 2: Function Refactoring):** "This should process orders, update
inventory, and track revenue. Identify responsibilities and break it into smaller functions."

**AI's responsibility map:**
1. **Validation** — item-in-inventory, sufficient quantity, customer-exists (3 early `continue`s).
2. **Pricing** — base price x qty, premium discount (x0.9).
3. **Inventory mutation** — `inventory[item_id]['quantity'] -= quantity` (a *side effect*).
4. **Shipping** — domestic vs international, free over $50.
5. **Tax** — x0.08.
6. **Result assembly** — build dict; **revenue tracking** — accumulate `total_revenue`.

**Before (single ~40-line function) to After (decomposed):**
```python
def process_orders(orders, inventory, customer_data):
    results, error_orders, total_revenue = [], [], 0
    for order in orders:
        error = validate_order(order, inventory, customer_data)
        if error:
            error_orders.append({'order_id': order['order_id'], 'error': error})
            continue
        price = calculate_price(order, customer_data)
        shipping = calculate_shipping(order, customer_data, price)
        tax = price * TAX_RATE
        final_price = price + shipping + tax
        inventory[order['item_id']]['quantity'] -= order['quantity']   # side effect kept, now obvious
        total_revenue += final_price
        results.append(build_result(order, price, shipping, tax, final_price))
    return {'processed_orders': results, 'error_orders': error_orders, 'total_revenue': total_revenue}

def validate_order(order, inventory, customer_data):
    item_id, qty, cid = order['item_id'], order['quantity'], order['customer_id']
    if item_id not in inventory:            return 'Item not in inventory'
    if inventory[item_id]['quantity'] < qty: return 'Insufficient quantity'
    if cid not in customer_data:            return 'Customer not found'
    return None

def calculate_price(order, customer_data):
    base = inventory[item_id]['price'] * order['quantity']
    if customer_data[order['customer_id']]['premium']:
        base *= PREMIUM_DISCOUNT   # 0.9
    return base

def calculate_shipping(order, customer_data, price):
    if customer_data[order['customer_id']]['location'] == 'domestic':
        return 0.0 if price >= FREE_SHIPPING_THRESHOLD else DOMESTIC_FLAT   # 5.99
    return INTERNATIONAL_FLAT     # 15.99
```
*(`TAX_RATE`, `PREMIUM_DISCOUNT`, `FREE_SHIPPING_THRESHOLD`, `DOMESTIC_FLAT`, `INTERNATIONAL_FLAT`
are named constants — the magic numbers `0.9`, `0.08`, `5.99`, `15.99`, `50` are now explained.)*

**My vs AI:** I'd have split validation out but left pricing/shipping inline; the AI correctly
isolated **shipping** as its own pure function and named the magic numbers — better than my plan.

---

## Example 3 — Code Duplication Detection (JavaScript: calculateUserStatistics)

**Prompt used (Prompt 3: Code Duplication Detection):** "Identify repeated patterns and suggest
consolidation."

**AI finding:** six near-identical loops — 3 `for` loops summing a field for an average, and 3
`for` loops finding the max of a field. They differ only in the *key* (`age`, `income`, `score`).

**Before (3 averages + 3 maxes) to After (data-driven):**
```javascript
function calculateUserStatistics(userData) {
  const metrics = ['age', 'income', 'score'];

  const summarize = (key) => {
    const values = userData.map(u => u[key]);
    const average = values.reduce((sum, v) => sum + v, 0) / userData.length;
    const highest = values.reduce((max, v) => (v > max ? v : max), values[0]);
    return { average, highest };
  };

  return metrics.reduce((acc, key) => {
    acc[key] = summarize(key);
    return acc;
  }, {});
}
```
**Readability-for-juniors trade-off:** the AI's version is concise, but a team of *junior* devs
may find explicit `averageOf(key)` / `maxOf(key)` helpers clearer. The exercise asks to *evaluate*
which is most readable for the team — my call: keep two small named helpers (`averageOf`,
`maxOf`) rather than the dense `reduce`, balancing DRY with clarity (the lesson's "clarity over
cleverness" pitfall).

<!-- ENDCHUNK2 -->

---

# Exercise 2 — Function Decomposition Challenge
*(applies section 2 prompts to the Java `registerUser` from Example 1)*

**Prompt 1 (Responsibility Analysis):** `registerUser` has 3 responsibilities — *validate*,
*check uniqueness*, *persist*. **Prompt 2 (Single-Responsibility Extraction):** extract
`isValidRegistration(...)`, `isUsernameTaken(...)`, `persistUser(...)`. **Prompt 3 (Conditional
Simplification):** replace the compound `if` with guard clauses.

```java
private boolean isValidRegistration(String u, String p, String e) {
    return u.length() >= MIN_USERNAME_LENGTH
        && p.length() >= MIN_PASSWORD_LENGTH
        && e.contains("@");
}
private boolean isUsernameTaken(String username) {
    for (User user : users) if (user.getUsername().equals(username)) return true;
    return false;
}
private boolean persistUser(User user) {
    return database.execute("INSERT INTO users (username,password,email) VALUES (?,?,?)",
        user.getUsername(), user.getPassword(), user.getEmail());
}
public boolean registerUser(String username, String password, String email) {
    if (!isValidRegistration(username, password, email)) return false;   // guard
    if (isUsernameTaken(username)) return false;                        // guard
    User newUser = new User(username, password, email);
    users.add(newUser);
    return persistUser(newUser);
}
```
Now each function has one reason to change; `registerUser` reads top-to-bottom with no nesting.

# Exercise 3 — Code Readability Challenge
*(applies section 3 prompts to the repo's `user_validator.js` "before" state)*

The original `validateUserData` was one ~150-line function with magic numbers (`3`, `8`, `13`,
`120`) and inline regexes. Applying **Prompt 2 (Comments)** and **Prompt 3 (Structure)**:
- Named constants: `MIN_USERNAME_LENGTH = 3`, `MIN_PASSWORD_LENGTH = 8`, `MIN_AGE = 13`, `MAX_AGE = 120`.
- Regexes hoisted to named constants (`EMAIL_REGEX`, `USERNAME_REGEX`, `ZIP_PATTERNS`).
- Long conditionals extracted to boolean-meaningful helpers; nesting reduced via early `return`.
- JSDoc on the public function + per-rule comments explaining *why* (e.g., "13 = minimum age per
  policy"), not *what*.

The already-refactored `user_validator.js` in this repo **is** that after-state (210 lines of
small focused functions). The readability win: a new dev can read `validateUsername` in isolation
and understand one rule, instead of scrolling a 150-line wall.

# Exercise 4 — Design Pattern Implementation Challenge
*(applies section 4 prompts to `user_validator.js`)*

**Prompt 1 (Pattern Opportunity Identification):** The chain of `validateX(userData, options,
errors)` calls is a textbook **Chain of Responsibility / Rule** pattern candidate — each rule is
independent and appends to a shared `errors` list.

**Chosen pattern — Strategy/Rule table (a lightweight Chain of Responsibility):**
```javascript
const VALIDATION_RULES = [
  { when: o => o.isRegistration,  run: validateRequiredRegistrationFields },
  { when: o => o.isRegistration,  run: validateUsername },
  { when: o => o.isRegistration,  run: validatePassword },
  { when: o => !o.isRegistration, run: validateRequiredProfileFields },
  { run: validateEmail },
  { run: validateDateOfBirth },
  { run: validateAddress },
  { run: validatePhone },
];

function validateUserData(userData, options = {}) {
  const errors = [];
  for (const rule of VALIDATION_RULES) {
    if (!rule.when || rule.when(options)) rule.run(userData, options, errors);
  }
  runCustomValidations(userData, options, errors);
  return errors;
}
```
**Benefits:** adding a rule = one line in the table (Open/Closed principle); `validateUserData`
no longer names every rule (less parameter bloat / tangled calls). **Drawbacks / risks (the
lesson's over-engineering pitfall):** for *this* size it may be needless indirection — the
explicit call list is arguably clearer. **Verification:** same inputs produce the same `errors`
array (behaviour preserved). I'd only adopt the table if rules grow frequently.

---

# Reflection Questions (whole assessment)

**1. Which prompting strategy did you find most useful? Why?**
*Function Responsibility Analysis* (decomposition) — it forces me to name each "job" the code
does before touching it, which is exactly the step I'd otherwise skip and then break things.

**2. What improvements did the AI suggest that you might not have thought of?**
The **SQL-injection** fix in the Java example, and **naming the magic numbers** in Python
(`0.9` to `PREMIUM_DISCOUNT`). Both are things I'd ship-blind without AI flagging them.

**3. Were there any suggestions the AI made that you disagreed with? Why?**
The dense `reduce`-based de-duplication in Example 3. For a *junior* team it trades readability
for brevity; I'd keep explicit `averageOf`/`maxOf` helpers. Also the rule-table pattern in
Exercise 4 — for the current rule count it's borderline over-engineering, so I'd hold off.

**4. How might you adapt these prompts for your specific codebase or tech stack?**
Add our real conventions to the prompt (camelCase, JSDoc, "no console.log in libs", 4-space
indent, named constants for thresholds). For the repo's JS, I'd attach the actual `models.js`
enums so the AI reasons about `TaskPriority` instead of guessing.

**5. What safeguards would you put in place before applying AI-suggested refactoring to prod?**
- Have **tests in place first** (per the lesson's cross-reference to testing) — the testing-001
  suite already guards `task_priority.js`, and `refactor-functions` should get one too.
- Apply changes in **small, behaviour-preserving steps**; run the suite after each.
- **Code review + diff check** that public signatures/error messages are unchanged.
- Treat any "smart" one-liner (like the `reduce`) with suspicion; prefer clarity.
- Verify security-sensitive changes (e.g., the SQL fix) with a real parameterized-query test.

**Principle reinforced — Know your words:** being able to name *decomposition*, *single
responsibility*, *magic number*, *Chain of Responsibility*, etc. is what let me write precise
prompts and evaluate the AI's answers instead of accepting them blindly.
