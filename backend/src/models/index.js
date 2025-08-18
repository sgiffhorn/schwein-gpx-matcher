// src/models/index.js
import dotenv from 'dotenv';
dotenv.config();

import { Sequelize } from 'sequelize';
import initSubmission from './Submission.js';

const {
  DB_HOST = 'localhost',
  DB_PORT = '3306',
  DB_NAME,
  DB_USER,
  DB_PASSWORD, 
} = process.env;

export const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: Number(DB_PORT),
  dialect: 'mariadb',   // or 'mysql' if you prefer
  logging: false,
});

export const Submission = initSubmission(sequelize);

// Call this from app startup
export async function initDb() {
  await sequelize.authenticate();
  // Creates/updates table + indexes defined above
  await sequelize.sync({ alter: true });
  console.log('✅ Database synced');
}