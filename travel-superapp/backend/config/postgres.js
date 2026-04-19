/**
 * PostgreSQL connection using Sequelize ORM
 * Handles: users, bookings, payments
 */

const { Sequelize } = require('sequelize');
// Models are imported here to register them with Sequelize before sync
// (imported for side effects — Sequelize auto-discovers them via sequelize.define)


const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT) || 5432,
  database: process.env.POSTGRES_DB || 'travel_superapp',
  username: process.env.POSTGRES_USER || 'travel_user',
  password: process.env.POSTGRES_PASSWORD || 'travel_pass_2024',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,         // adds createdAt, updatedAt
    underscored: true,        // snake_case column names
    freezeTableName: false,   // pluralize table names
  },
});

async function connectPostgres() {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected successfully');

    // Sync models — create tables if they don't exist, skip altering existing ones
    // (alter:true generates invalid SQL on some PG versions for UNIQUE columns)
    await sequelize.sync({ alter: false });
    console.log('✅ PostgreSQL models synchronized');
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    throw error;
  }
}

module.exports = { sequelize, connectPostgres };
