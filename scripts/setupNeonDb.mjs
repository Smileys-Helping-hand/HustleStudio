#!/usr/bin/env node
// Setup Neon PostgreSQL Database Schema
// Usage: node scripts/setupNeonDb.mjs

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.VITE_NEON_CONNECTION_STRING;

if (!connectionString) {
  console.error('❌ DATABASE_URL or VITE_NEON_CONNECTION_STRING not set in .env.local');
  process.exit(1);
}

console.log('🔄 Connecting to Neon Database...');

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const schema = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uid VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  owner_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  invoice_number VARCHAR(255) UNIQUE NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  client_address TEXT,
  company_name VARCHAR(255),
  company_email VARCHAR(255),
  company_phone VARCHAR(20),
  subtotal DECIMAL(10, 2),
  tax DECIMAL(10, 2),
  tax_rate DECIMAL(5, 2),
  total DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'R',
  status VARCHAR(50) DEFAULT 'draft',
  notes TEXT,
  line_items JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

-- Quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  quote_number VARCHAR(255) UNIQUE NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  client_address TEXT,
  company_name VARCHAR(255),
  company_email VARCHAR(255),
  company_phone VARCHAR(20),
  total DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'R',
  status VARCHAR(50) DEFAULT 'draft',
  validity_days INTEGER DEFAULT 30,
  notes TEXT,
  line_items JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  company VARCHAR(255),
  stage VARCHAR(100) DEFAULT 'Discovery',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_quotes_tenant ON quotes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotes_number ON quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_stage ON contacts(stage);
CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
`;

async function setupDatabase() {
  let client;

  try {
    client = await pool.connect();
    console.log('✅ Connected to Neon Database');

    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      try {
        await client.query(statement);
        const table = statement.match(/table.*?(\w+)/i)?.[1] || 'index';
        console.log(`✅ Created/Updated: ${table}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️  Already exists: ${statement.substring(0, 50)}...`);
        } else {
          console.error(`❌ Error: ${error.message}`);
        }
      }
    }

    console.log('\n✅ Database setup complete!');
    console.log('\n📊 Tables created:');
    console.log('  - users');
    console.log('  - tenants');
    console.log('  - invoices');
    console.log('  - quotes');
    console.log('  - contacts');
    console.log('\n🔐 With connection pooling and proper indexes for performance');
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

setupDatabase();
