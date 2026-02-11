import dotenv from "dotenv";

dotenv.config();

export const PORT = parseInt(process.env.PORT || "3000", 10);
export const JWT_SECRET = process.env.JWT_SECRET || "default-secret";
export const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || "default-encryption-secret";
export const UPSTASH_REDIS_URL = process.env.UPSTASH_REDIS_URL || "";
export const DATABASE_URL = process.env.DATABASE_URL || ""; 
