import path from "path";
import fs from "fs";
import QRCode from "qrcode";
import { randomUUID } from "crypto";

const OUTPUT_DIR = path.resolve(__dirname, "..");
const filePath = path.join(OUTPUT_DIR, "test-qr.png");

async function main() {
  const data = randomUUID();

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  await QRCode.toFile(filePath, data, {
    type: "png",
    width: 400,
    margin: 2,
  });

  console.log(`QR code generated → ${path.relative(process.cwd(), filePath)}`);
  console.log(`Data: ${data}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
