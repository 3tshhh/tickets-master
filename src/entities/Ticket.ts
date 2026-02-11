import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

export enum TicketType {
  REGULAR = "regular",
  VIP = "vip",
  TEST = "test",
}

@Entity()
export class Ticket {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "text" })
  ticketType!: TicketType;

  @Column()
  venueName!: string;

  @Column()
  eventTime!: Date;

  @Column({ default: false })
  isUsed!: boolean;
}
