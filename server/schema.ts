/**
 * This file is used to define the schema for the database.
 * 
 * After making changes to this file, run `npm run db:generate` to generate the migration file.
 * Then, by just using the app, the migration is lazily ensured at runtime.
 */
import { integer, sqliteTable, text } from "@deco/workers-runtime/drizzle";

export const todosTable = sqliteTable("todos", {
  id: integer("id").primaryKey(),
  title: text("title"),
  completed: integer("completed").default(0),
});

export const passengersTable = sqliteTable("passengers", {
  id: integer("id").primaryKey(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  nationality: text("nationality"),
  dateOfBirth: text("date_of_birth"),
  flightNumber: text("flight_number"),
  departureCity: text("departure_city"),
  arrivalCity: text("arrival_city"),
  departureDate: text("departure_date"),
  price: text("price"),
  status: text("status"),
  distance: text("distance"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});
