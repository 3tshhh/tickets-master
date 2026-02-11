import "reflect-metadata";
import { AppDataSource } from "./database/data-source";
import app from "./app";
import { PORT } from "./config/env";

AppDataSource.initialize()
  .then(() => {
    console.log("Database connected successfully");

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Error initializing database:", error);
    process.exit(1);
  });
