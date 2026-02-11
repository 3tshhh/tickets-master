import { DataSource } from "typeorm";
import { Ticket } from "../entities/Ticket";
import { DATABASE_URL } from "../config/env";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: DATABASE_URL,
  synchronize: false,
  logging: false,
  entities: [Ticket],
  ssl: {
    rejectUnauthorized: false,
  },
});
