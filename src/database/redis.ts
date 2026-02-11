import Redis from "ioredis";
import { UPSTASH_REDIS_URL } from "../config/env";

export const redis = new Redis(UPSTASH_REDIS_URL);

export async function setEncryptedJWT(uuid: string, encryptedJWT: string): Promise<void> {
  await redis.set(uuid, encryptedJWT);
}

export async function getEncryptedJWT(uuid: string): Promise<string | null> {
  return redis.get(uuid);
}

export async function bulkSetEncryptedJWT(
  entries: { uuid: string; encryptedJWT: string }[]
): Promise<void> {
  const pipeline = redis.pipeline();
  for (const { uuid, encryptedJWT } of entries) {
    pipeline.set(uuid, encryptedJWT);
  }
  await pipeline.exec();
}
