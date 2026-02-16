import { AppDataSource } from "../database/data-source";
import { Ticket, TicketType } from "../entities/Ticket";

const ticketRepo = AppDataSource.getRepository(Ticket);

export interface CreateTicketInput {
  ticketType: TicketType;
  venueName: string;
  eventTime: Date;
}

export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  const ticket = ticketRepo.create({
    ticketType: input.ticketType,
    venueName: input.venueName,
    eventTime: input.eventTime,
    isUsed: false,
  });
  return ticketRepo.save(ticket);
}

export async function bulkCreateTickets(input: CreateTicketInput, count: number): Promise<Ticket[]> {
  const tickets = Array.from({ length: count }, () =>
    ticketRepo.create({
      ticketType: input.ticketType,
      venueName: input.venueName,
      eventTime: input.eventTime,
      isUsed: false,
    })
  );
  return ticketRepo.save(tickets);
}

export async function getTicketById(id: number): Promise<Ticket | null> {
  return ticketRepo.findOneBy({ id });
}

export async function getAllTickets(): Promise<Ticket[]> {
  return ticketRepo.find();
}

export async function markTicketAsUsed(id: number): Promise<Ticket | null> {
  const ticket = await ticketRepo.findOneBy({ id });
  if (!ticket) return null;
  ticket.isUsed = true;
  return ticketRepo.save(ticket);
}

export async function markTicketAsunUsed(id: number): Promise<Ticket | null> {
  const ticket = await ticketRepo.findOneBy({ id });
  if (!ticket) return null;
  ticket.isUsed = false;
  return ticketRepo.save(ticket);
}

