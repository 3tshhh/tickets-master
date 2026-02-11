import QRCode from "qrcode";
import path from "path";
import fs from "fs";

const QR_IMAGES_DIR = path.resolve(__dirname, "..", "..", "qr-images");

export async function generateQR(data: string): Promise<string> {
  return QRCode.toDataURL(data);
}

/**
 * Save a QR code PNG to disk under the ticket-type subfolder.
 *
 * @param data       - The string to encode (UUID)
 * @param ticketType - "regular" | "vip" | "test" → determines subfolder
 * @param ticketId   - Used for the filename: ticket-{id}.png
 * @returns          The absolute path to the saved file
 */
export async function saveQRImage(
  data: string,
  ticketType: string,
  ticketId: number
): Promise<string> {
  const folder = path.join(QR_IMAGES_DIR, ticketType);
  fs.mkdirSync(folder, { recursive: true });

  const filePath = path.join(folder, `ticket-${ticketId}.png`);
  await QRCode.toFile(filePath, data, { type: "png", width: 400, margin: 2 });
  return filePath;
}
