// orders-service.js
const { Pool } = require('pg');

// Database connection - use environment variables with fallbacks.
// PERFORMANCE FIX: bound the pool size and idle/connection timeouts so a busy Express
// server cannot exhaust PostgreSQL connections. The pool is created once and shared
// across requests (do NOT create a new Pool per request).
const pool = new Pool({
  user: process.env.DB_USER || 'app_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'ecommerce',
  password: process.env.DB_PASSWORD || 'password123',
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log connection info when service starts
console.log(`Database connection: ${process.env.DB_USER || 'app_user'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'ecommerce'}`);

/**
 * Fetch all order details for a customer within a date range.
 *
 * PERFORMANCE FIX: the original query used *correlated scalar subqueries* in the SELECT
 * list (one `json_agg`/`array_agg` subquery re-executed per order row). For many orders
 * this is an N+1 pattern in disguise. The version below computes items and status history
 * once with GROUP BY CTEs and LEFT JOINs them onto the order rows — a single plan, no
 * per-row subqueries. Proper indexes (see init-db.js: idx_order_items_order,
 * idx_order_items_product, idx_status_history_order) make the CTEs cheap.
 *
 * @param {number|string} customerId
 * @param {string} startDate - inclusive lower bound (YYYY-MM-DD)
 * @param {string} endDate - inclusive upper bound (YYYY-MM-DD)
 * @returns {Promise<Array>} Rows with order fields plus `items` and `status_history`.
 */
async function getCustomerOrderDetails(customerId, startDate, endDate) {
  try {
    const result = await pool.query(`
      WITH order_base AS (
        SELECT
          o.order_id,
          o.order_date,
          o.total_amount,
          o.status,
          c.customer_name,
          c.email,
          a.street,
          a.city,
          a.state,
          a.postal_code,
          a.country
        FROM orders o
        JOIN customers c ON o.customer_id = c.customer_id
        LEFT JOIN addresses a ON o.shipping_address_id = a.address_id
        WHERE o.customer_id = $1
          AND o.order_date BETWEEN $2 AND $3
      ),
      items AS (
        SELECT
          oi.order_id,
          json_agg(
            json_build_object(
              'product_id', p.product_id,
              'product_name', p.name,
              'quantity', oi.quantity,
              'unit_price', p.price,
              'subtotal', (oi.quantity * p.price)
            )
          ) AS items
        FROM order_items oi
        JOIN products p ON oi.product_id = p.product_id
        GROUP BY oi.order_id
      ),
      history AS (
        SELECT
          s.order_id,
          array_to_json(
            array_agg(
              json_build_object(
                'status', s.status,
                'date', s.status_date,
                'notes', s.notes
              )
              ORDER BY s.status_date DESC
            )
          ) AS status_history
        FROM order_status_history s
        GROUP BY s.order_id
      )
      SELECT
        ob.order_id,
        ob.order_date,
        ob.total_amount,
        ob.status,
        ob.customer_name,
        ob.email,
        ob.street,
        ob.city,
        ob.state,
        ob.postal_code,
        ob.country,
        items.items,
        history.status_history
      FROM order_base ob
      LEFT JOIN items ON items.order_id = ob.order_id
      LEFT JOIN history ON history.order_id = ob.order_id
      ORDER BY ob.order_date DESC
    `, [customerId, startDate, endDate]);

    return result.rows;
  } catch (err) {
    console.error('Database query error:', err);
    throw err;
  }
}

/**
 * Run EXPLAIN ANALYZE for the query so students can measure the plan before/after tuning.
 * Usage: node -e "require('./orders-service').explainPlan(1,'2023-01-01','2023-12-31')"
 */
async function explainPlan(customerId, startDate, endDate) {
  const result = await pool.query(
    `EXPLAIN ANALYZE
     SELECT o.order_id FROM orders o
     WHERE o.customer_id = $1 AND o.order_date BETWEEN $2 AND $3`,
    [customerId, startDate, endDate]
  );
  console.log(result.rows.map(r => r['QUERY PLAN']).join('\n'));
}

// Example usage in Express route handler
async function getOrdersHandler(req, res) {
  try {
    const { customerId } = req.params;
    const { startDate = '2023-01-01', endDate = '2023-12-31' } = req.query;

    const orders = await getCustomerOrderDetails(customerId, startDate, endDate);

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Error in getOrdersHandler:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while fetching orders'
    });
  }
}

module.exports = {
  getCustomerOrderDetails,
  getOrdersHandler,
  explainPlan
};