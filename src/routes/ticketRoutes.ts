import { Router, Request, Response } from "express";
import {
  createTicket,
  bulkCreateTickets,
  getTicketById,
  getAllTickets,
  markTicketAsUsed,
} from "../services/ticketService";
import crypto from "crypto";
import { signToken, verifyToken } from "../utils/jwt";
import { generateQR, saveQRImage } from "../utils/qr";
import { encrypt, decrypt } from "../utils/crypto";
import { setEncryptedJWT, getEncryptedJWT, bulkSetEncryptedJWT } from "../database/redis";
import { TicketType } from "../entities/Ticket";

const router = Router();

// POST /api/tickets — Create ticket + generate QR
router.post("/", async (req: Request, res: Response) => {
  try {
    const { ticketType, venueName, eventTime } = req.body;

    if (!ticketType || !venueName || !eventTime) {
      res.status(400).json({ error: "ticketType, venueName, and eventTime are required" });
      return;
    }

    if (!Object.values(TicketType).includes(ticketType)) {
      res.status(400).json({ error: "ticketType must be 'regular', 'vip', or 'test'" });
      return;
    }

    const ticket = await createTicket({
      ticketType,
      venueName,
      eventTime: new Date(eventTime),
    });

    const token = signToken({
      id: ticket.id,
      ticketType: ticket.ticketType,
      venueName: ticket.venueName,
      eventTime: ticket.eventTime.toString(),
    });

    const encrypted = encrypt(token);
    const uuid = crypto.randomUUID();
    await setEncryptedJWT(uuid, encrypted);
    const qrCode = await generateQR(uuid);

    res.status(201).json({ ticket, qrCode });
  } catch (error) {
    console.error("Error creating ticket:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/tickets/bulk — Bulk create tickets
router.post("/bulk", async (req: Request, res: Response) => {
  try {
    const { ticketType, venueName, eventTime, count } = req.body;

    if (!ticketType || !venueName || !eventTime || !count) {
      res.status(400).json({ error: "ticketType, venueName, eventTime, and count are required" });
      return;
    }

    if (!Number.isInteger(count) || count < 1 || count > 500) {
      res.status(400).json({ error: "count must be an integer between 1 and 500" });
      return;
    }

    if (!Object.values(TicketType).includes(ticketType)) {
      res.status(400).json({ error: "ticketType must be 'regular', 'vip', or 'test'" });
      return;
    }

    const tickets = await bulkCreateTickets(
      { ticketType, venueName, eventTime: new Date(eventTime) },
      count
    );

    // CPU-only loop: sign, encrypt, generate UUID for each ticket
    const entries: { ticket: typeof tickets[0]; uuid: string; encryptedJWT: string }[] = [];
    for (const ticket of tickets) {
      const token = signToken({
        id: ticket.id,
        ticketType: ticket.ticketType,
        venueName: ticket.venueName,
        eventTime: ticket.eventTime.toString(),
      });
      const encryptedJWT = encrypt(token);
      const uuid = crypto.randomUUID();
      entries.push({ ticket, uuid, encryptedJWT });
    }

    // Single Redis round-trip: pipeline all SET commands
    await bulkSetEncryptedJWT(
      entries.map(({ uuid, encryptedJWT }) => ({ uuid, encryptedJWT }))
    );

    // Parallel QR generation + image saving from UUIDs
    const results = await Promise.all(
      entries.map(async ({ ticket, uuid }) => {
        const [qrCode, imagePath] = await Promise.all([
          generateQR(uuid),
          saveQRImage(uuid, ticket.ticketType, ticket.id),
        ]);
        return { ticket, qrCode, imagePath };
      })
    );

    res.status(201).json({ count: results.length, tickets: results });
  } catch (error) {
    console.error("Error bulk creating tickets:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/tickets — Get all tickets
router.get("/", async (_req: Request, res: Response) => {
  try {
    const tickets = await getAllTickets();
    res.json(tickets);
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/tickets/:id/qr — Re-generate QR for a ticket
router.get("/:id/qr", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const ticket = await getTicketById(id);

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const token = signToken({
      id: ticket.id,
      ticketType: ticket.ticketType,
      venueName: ticket.venueName,
      eventTime: ticket.eventTime.toString(),
    });

    const encrypted = encrypt(token);
    const uuid = crypto.randomUUID();
    await setEncryptedJWT(uuid, encrypted);
    const qrCode = await generateQR(uuid);

    res.json({ ticket, qrCode });
  } catch (error) {
    console.error("Error generating QR:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/tickets/verify — Verify a ticket from scanned QR
router.post("/verify", async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ valid: false, message: "Token is required" });
      return;
    }

    // Fetch encrypted JWT from Redis using the UUID
    const encryptedJWT = await getEncryptedJWT(token);
    if (!encryptedJWT) {
      res.status(400).json({ valid: false, message: "Invalid or expired token" });
      return;
    }

    let payload;
    try {
      const decrypted = decrypt(encryptedJWT);
      payload = verifyToken(decrypted);
    } catch {
      res.status(400).json({ valid: false, message: "Invalid or expired token" });
      return;
    }

    const ticket = await getTicketById(payload.id);

    if (!ticket) {
      res.status(404).json({ valid: false, message: "Ticket not found" });
      return;
    }

    if (ticket.isUsed) {
      res.status(400).json({ valid: false, message: "Ticket has already been used" });
      return;
    }

    const updatedTicket = await markTicketAsUsed(ticket.id);

    // Re-sign JWT with updated isUsed, encrypt, and update Redis
    const newToken = signToken({
      id: updatedTicket!.id,
      ticketType: updatedTicket!.ticketType,
      venueName: updatedTicket!.venueName,
      eventTime: updatedTicket!.eventTime.toString(),
    });
    const newEncrypted = encrypt(newToken);
    await setEncryptedJWT(token, newEncrypted);

    res.json({
      valid: true,
      message: "Ticket verified successfully",
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error("Error verifying ticket:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
