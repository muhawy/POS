import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, 'data')
const dbPath = join(dataDir, 'pos.sqlite')

mkdirSync(dataDir, { recursive: true })

export const db = new DatabaseSync(dbPath)

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    price INTEGER NOT NULL,
    cost INTEGER NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0
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
    tax INTEGER NOT NULL,
    total INTEGER NOT NULL,
    paid INTEGER NOT NULL,
    change_amount INTEGER NOT NULL,
    profit INTEGER NOT NULL,
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
    quantity INTEGER NOT NULL,
    line_total INTEGER NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
  );
`)

export function resetDatabase(seedData) {
  db.exec(`
    DELETE FROM sale_items;
    DELETE FROM sales;
    DELETE FROM products;
    DELETE FROM customers;
  `)

  const insertProduct = db.prepare(`
    INSERT INTO products (id, name, sku, category, price, cost, stock)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const insertCustomer = db.prepare(`
    INSERT INTO customers (id, name, phone)
    VALUES (?, ?, ?)
  `)

  seedData.products.forEach((product) => {
    insertProduct.run(product.id, product.name, product.sku, product.category, product.price, product.cost, product.stock)
  })

  seedData.customers.forEach((customer) => {
    insertCustomer.run(customer.id, customer.name, customer.phone)
  })
}

export function seedDatabase(seedData) {
  const count = db.prepare('SELECT COUNT(*) AS total FROM products').get()
  if (count.total === 0) {
    resetDatabase(seedData)
  }
}
