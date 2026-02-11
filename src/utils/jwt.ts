import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env";

export interface TicketPayload {
  id: number;
  ticketType: string;
  venueName: string;
  eventTime: string;
}

export function signToken(payload: TicketPayload): string {
  const eventDate = new Date(payload.eventTime);
  const expiresAt = Math.floor(eventDate.getTime() / 1000) + 86400; // 1 day after event
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresAt });
}

export function verifyToken(token: string): TicketPayload {
  return jwt.verify(token, JWT_SECRET) as TicketPayload;
}
