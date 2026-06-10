import { mkdirSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const defaultDbPath = join(__dirname, 'data', 'pos.sqlite')
const dbPath = process.env.DATABASE_PATH
  ? isAbsolute(process.env.DATABASE_PATH)
    ? process.env.DATABASE_PATH
    : resolve(process.cwd(), process.env.DATABASE_PATH)
  : defaultDbPath
const dataDir = dirname(dbPath)

mkdirSync(dataDir, { recursive: true })

export const db = new DatabaseSync(dbPath)
export const databasePath = dbPath

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    price INTEGER NOT NULL,
    cost INTEGER NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    image_url TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '-'
  );

  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    number TEXT NOT NULL UNIQUE,
    date TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    subtotal INTEGER NOT NULL,
    discount INTEGER NOT NULL DEFAULT 0,
    discount_type TEXT NOT NULL DEFAULT 'amount',
    discount_value REAL NOT NULL DEFAULT 0,
    tax INTEGER NOT NULL,
    total INTEGER NOT NULL,
    paid INTEGER NOT NULL,
    change_amount INTEGER NOT NULL,
    profit INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    cancelled_at TEXT,
    cancellation_type TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    price INTEGER NOT NULL,
    cost INTEGER NOT NULL,
    image_url TEXT NOT NULL DEFAULT '',
    quantity INTEGER NOT NULL,
    line_total INTEGER NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`)

for (const statement of [
  "ALTER TABLE products ADD COLUMN image_url TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE sale_items ADD COLUMN image_url TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE sales ADD COLUMN discount INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE sales ADD COLUMN discount_type TEXT NOT NULL DEFAULT 'amount'",
  "ALTER TABLE sales ADD COLUMN discount_value REAL NOT NULL DEFAULT 0",
  "ALTER TABLE sales ADD COLUMN status TEXT NOT NULL DEFAULT 'completed'",
  "ALTER TABLE sales ADD COLUMN cancelled_at TEXT",
  "ALTER TABLE sales ADD COLUMN cancellation_type TEXT",
]) {
  try {
    db.exec(statement)
  } catch (error) {
    if (!String(error.message).includes('duplicate column name')) {
      throw error
    }
  }
}

export function resetDatabase(seedData) {
  db.exec(`
    DELETE FROM sale_items;
    DELETE FROM sales;
    DELETE FROM products;
    DELETE FROM customers;
    DELETE FROM settings;
  `)

  const insertProduct = db.prepare(`
    INSERT INTO products (id, name, sku, category, price, cost, stock, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertCustomer = db.prepare(`
    INSERT INTO customers (id, name, phone)
    VALUES (?, ?, ?)
  `)
  const insertSetting = db.prepare(`
    INSERT INTO settings (key, value)
    VALUES (?, ?)
  `)
  const insertSale = db.prepare(`
    INSERT INTO sales (
      id, number, date, customer_id, customer_name, payment_method,
      subtotal, discount, discount_type, discount_value, tax, total, paid, change_amount, profit, status, cancelled_at, cancellation_type
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertSaleItem = db.prepare(`
    INSERT INTO sale_items (sale_id, product_id, name, sku, price, cost, image_url, quantity, line_total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  seedData.products.forEach((product) => {
    insertProduct.run(product.id, product.name, product.sku, product.category, product.price, product.cost, product.stock, product.imageUrl || '')
  })

  seedData.customers.forEach((customer) => {
    insertCustomer.run(customer.id, customer.name, customer.phone)
  })

  Object.entries(seedData.settings).forEach(([key, value]) => {
    insertSetting.run(key, JSON.stringify(value))
  })

  ;(seedData.sales || []).forEach((sale) => {
    insertSale.run(
      sale.id,
      sale.number,
      sale.date,
      sale.customerId,
      sale.customerName,
      sale.paymentMethod,
      sale.subtotal,
      Number(sale.discount) || 0,
      sale.discountType || 'amount',
      Number(sale.discountValue ?? sale.discount) || 0,
      sale.tax,
      sale.total,
      sale.paid,
      sale.change,
      sale.profit,
      sale.status || 'completed',
      sale.cancelledAt || null,
      sale.cancellationType || null,
    )
    ;(sale.items || []).forEach((item) => {
      insertSaleItem.run(sale.id, item.productId, item.name, item.sku, item.price, item.cost, item.imageUrl || '', item.quantity, item.lineTotal)
    })
  })
}

export function seedDatabase(seedData) {
  const count = db.prepare('SELECT COUNT(*) AS total FROM products').get()
  if (count.total === 0) {
    resetDatabase(seedData)
  }

  const settingsCount = db.prepare('SELECT COUNT(*) AS total FROM settings').get()
  if (settingsCount.total === 0) {
    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
    Object.entries(seedData.settings).forEach(([key, value]) => {
      insertSetting.run(key, JSON.stringify(value))
    })
  }
}
