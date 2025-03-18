import dotenv from "dotenv";  // Use import em vez de require
dotenv.config();

import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
    console.error("Erro: A variável DATABASE_URL não está definida.");
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("render.com") ? { rejectUnauthorized: false } : false,
});

export default pool;
