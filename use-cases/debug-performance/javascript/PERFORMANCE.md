# Exercise 7 — Performance Optimization Challenge (JavaScript)

Deliverable for the **Performance Optimization Challenge**. The starter
(`orders-service.js` + `init-db.js`) queries a PostgreSQL `ecommerce` database for a
customer's orders, items, and status history. Below are the optimizations applied and how
to measure them. (The query itself cannot be executed here without a live PostgreSQL
instance, so verification is described in terms of `EXPLAIN ANALYZE`.)

## Baseline problems identified

1. **Correlated subqueries in the SELECT list.** The original `getCustomerOrderDetails`
   embedded two scalar subqueries (`json_agg(...)` for items, `array_agg(...)` for status
   history) that the planner re-runs for *every* order row returned — an N+1 pattern. With
   many orders this dominates cost.
2. **Missing indexes.** `order_items.product_id` and `order_status_history.order_id` had no
   explicit indexes, so the subqueries' joins did sequential scans.
3. **Unbounded connection pool.** `new Pool({...})` with no `max`/`idleTimeoutMillis` can
   exhaust connections under load, causing stalls that look like "slow queries".

## Optimizations applied

### A. Rewrite the query (single plan, no per-row subqueries)
`orders-service.js` now builds `items` and `history` with `GROUP BY` CTEs and `LEFT JOIN`s
them onto the order rows. One execution plan, no correlated subqueries.

### B. Add the missing indexes (`init-db.js`)
```sql
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_status_history_order ON order_status_history(order_id);
```
(`idx_orders_customer_date` already covered the `WHERE customer_id … AND order_date …`
filter; `idx_order_items_order` already covered the join.)

### C. Tune the connection pool (`orders-service.js`)
```js
const pool = new Pool({ /* … */ max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 2000 });
```
The pool is created **once** at module load and shared across requests — never per request.

### D. Added an `explainPlan()` helper
Lets you capture `EXPLAIN ANALYZE` output to compare plans before/after:
```js
node -e "require('./orders-service').explainPlan(1,'2023-01-01','2023-12-31')"
```

## How to measure (with a real DB)

1. Start the stack: `docker-compose up` (or set the `DB_*` env vars and `npm start`).
2. Capture the baseline with `test-query.js` → note "Query Execution Time".
3. Apply the index migration (`init-db.js` already creates them) and the rewritten query.
4. Re-run `test-query.js`; the time should drop and `EXPLAIN ANALYZE` should show index
   scans (`Index Scan using idx_orders_customer_date`) instead of sequential scans, and no
   nested `SubPlan` rows for items/history.

## Other candidate optimizations (not required here)
- Add `total_amount` check / pagination (`LIMIT/OFFSET` or keyset) for very large customers.
- Cache the prepared statement with `pool.query({ name, text, values })` for repeated calls.
- Store a denormalized `order_summary` if this read path is hot.
