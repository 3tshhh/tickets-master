import "reflect-metadata";
import crypto from "crypto";
import path from "path";
import { AppDataSource } from "./database/data-source";
import { Ticket } from "./entities/Ticket";
import { signToken } from "./utils/jwt";
import { encrypt } from "./utils/crypto";
import { setEncryptedJWT, redis } from "./database/redis";
import { saveQRImage } from "./utils/qr";

async function main() {
  await AppDataSource.initialize();
  console.log("Database connected.");

  const ticketRepo = AppDataSource.getRepository(Ticket);
  const tickets = await ticketRepo.find({ where: { isUsed: false } });

  if (tickets.length === 0) {
    console.log("No tickets found in the database.");
    await AppDataSource.destroy();
    redis.disconnect();
    return;
  }

  console.log(`Found ${tickets.length} ticket(s). Generating QR codes...\n`);

  for (const ticket of tickets) {
    const token = signToken({
      id: ticket.id,
      ticketType: ticket.ticketType,
      venueName: ticket.venueName,
      eventTime: ticket.eventTime.toString(),
    });

    const encrypted = encrypt(token);
    const uuid = crypto.randomUUID();
    await setEncryptedJWT(uuid, encrypted);

    const filePath = await saveQRImage(uuid, ticket.ticketType, ticket.id);

    console.log(`  ✔ ${ticket.ticketType.toUpperCase()} #${ticket.id} → ${path.relative(process.cwd(), filePath)}`);
  }

  console.log(`\nDone! QR codes saved to qr-images/`);
  await AppDataSource.destroy();
  redis.disconnect();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
