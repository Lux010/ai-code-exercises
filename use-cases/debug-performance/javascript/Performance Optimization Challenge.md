# Exercise — Performance Optimization Challenge (JavaScript / PostgreSQL)

**Scenario selected:** Slow database query in `orders-service.js`
(`getCustomerOrderDetails`) — a customer-orders report endpoint.
**Starter code:** `use-cases/debug-performance/javascript/orders-service.js`
(+ `init-db.js`, `PERFORMANCE.md`).
**Prompts applied:** Prompt 3 (Slow Database Query Analysis) + Prompt 1 (Slow Code Analysis)
from the "Identifying Performance Bottlenecks" section.

> The exercise only requires analysis + documentation; the optimised code and indexes are
> already committed in this folder and the `EXPLAIN ANALYZE` helper exists for before/after
> measurement.

---

## 1. Prompt 3 — Slow Database Query Analysis

> **Prompt used:** "I have a PostgreSQL query that's slow. It returns order details (items +
> status history) for a customer in a date range. Typical input: ~5,000 orders for a customer.
> It takes multiple seconds. The original SELECT used correlated `json_agg`/`array_agg`
> subqueries in the SELECT list. Schema: orders(50M rows), order_items(200M),
> order_status_history(80M), customers, products, addresses. Indexes: PKs only. Could you:
> (1) explain why it's slow, (2) flag the slow parts, (3) suggest query + index fixes,
> (4) explain the concepts, (5) suggest how to measure before/after."

**AI-style explanation (recorded):**
1. **Why slow:** A correlated subquery in the SELECT list runs *once per output row*. Pulling
   items + history per order with 5,000 orders = ~10,000 extra aggregate queries — an N+1
   pattern hidden inside SQL. Each re-scans `order_items`/`order_status_history` with no useful
   index (only PKs), so it's sequential scans at scale.
2. **Slow parts:** the two scalar subqueries in SELECT; the missing secondary indexes on
   `order_items(order_id)`, `order_items(product_id)`, `order_status_history(order_id)`.
3. **Fixes:** compute items and history **once** with `GROUP BY` CTEs, then `LEFT JOIN` them
   onto the order rows (single plan, no per-row subqueries); add the three secondary indexes.
4. **Concepts:** correlated vs. non-correlated subqueries, join vs. N+1, covering/indexed
   access, the planner favouring hash/merge joins once indexes exist, `EXPLAIN ANALYZE`.
5. **Measure:** run `EXPLAIN ANALYZE` before and after; compare total runtime and whether
   Seq Scans become Index Scans.

---

## 2. Prompt 1 — Slow Code Analysis (connection layer)

> **Prompt used:** "My Node service also feels slow under load and sometimes hangs. Here's the
> DB client setup. ~200 concurrent requests. What's wrong and how do I improve it?"

**AI-style explanation (recorded):**
- **Why slow/stuck:** creating a *new* `Pool` per request (or unbounded `max`) exhausts
  PostgreSQL's connection limit; requests then queue/timeout. 
- **Fix applied:** one shared `Pool` with `max: 20`, `idleTimeoutMillis: 30000`,
  `connectionTimeoutMillis: 2000`. This bounds resources and fails fast instead of hanging.

---

## 3. Structured analysis (required format)

### Performance Analysis: Correlated Subqueries + Missing Indexes + Unbounded Pool

**Issue Description:**
The endpoint that builds a customer's order report is slow (seconds) and the server degrades
under load. Two independent problems: (a) the SQL does redundant per-row aggregate subqueries,
and (b) the connection pool was either per-request or unbounded, exhausting DB connections.

**Root Cause:**
- *Query:* correlated `json_agg`/`array_agg` subqueries in the SELECT list → N+1 execution;
  with only PK indexes, the inner scans are sequential over huge tables.
- *Pool:* a fresh/unbounded `Pool` per request saturates PostgreSQL's `max_connections`,
  causing queueing and timeouts under concurrency.

**Solution:**
```sql
-- Indexes (init-db.js) so the CTE aggregates are index scans, not seq scans:
CREATE INDEX IF NOT EXISTS idx_order_items_order    ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product  ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_status_history_order ON order_status_history(order_id);
```
```javascript
// Query (orders-service.js): replace per-row subqueries with GROUP BY CTEs + LEFT JOINs
WITH order_base AS (...),
     items  AS (SELECT oi.order_id, json_agg(...) FROM order_items oi JOIN products p ... GROUP BY oi.order_id),
     history AS (SELECT s.order_id, array_to_json(array_agg(... ORDER BY s.status_date DESC))
                 FROM order_status_history s GROUP BY s.order_id)
SELECT ob.*, items.items, history.status_history
FROM order_base ob
LEFT JOIN items   ON items.order_id   = ob.order_id
LEFT JOIN history ON history.order_id = ob.order_id
ORDER BY ob.order_date DESC;

// Pool: one shared, bounded pool (max 20, idle 30s, connect timeout 2s)
const pool = new Pool({ ...config, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 2000 });
```
(Measure with `explainPlan()` which runs `EXPLAIN ANALYZE` on the order scan.)

**Learning Points:**
- Correlated subqueries in SELECT = hidden N+1; prefer CTEs/`GROUP BY` + joins.
- Index the join/aggregate keys, not just PKs.
- Always bound and share a DB connection pool; never create one per request.
- Measure with `EXPLAIN ANALYZE` before claiming a win (Pitfall 1: optimising without measurement).
- Prefer algorithmic/index changes over micro-optimisations (Pitfall 3: readability vs. gains).

---

## 4. Reflection questions

**Q1. How did the AI's explanation compare to documentation you found online?**
Postgres docs explain `json_agg` and CTEs in isolation; they don't call out "a SELECT-list
subquery is re-run per row." The AI connected the *pattern* to N+1 and to the missing indexes —
the practical, joined-up view generic docs omit.

**Q2. What aspects would have been difficult to diagnose manually?**
Recognising that a query returning "only 5,000 rows" was internally running ~10k sub-queries,
and that the *pool* (not the SQL) was the load-time hang. Both need `EXPLAIN ANALYZE` + a
concurrency test, easy to skip when you only profile a single request.

**Q3. How would you modify the code to surface performance issues earlier?**
- Add `EXPLAIN ANALYZE` assertions in tests (reject Seq Scans on the big tables).
- Log query duration + pool wait time; alert if p95 > threshold.
- Load-test with `k6`/Artillery before shipping report endpoints.

**Q4. Did the AI help you understand the underlying concept, not just the fix?**
Yes — it explained *why* correlated subqueries explode at scale and *why* a bounded shared pool
matters (Postgres connection cost), concepts that transfer to any ORM/query I write later.
