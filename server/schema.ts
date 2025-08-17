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
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  passportNumber: text("passport_number"),
  nationality: text("nationality"),
  dateOfBirth: text("date_of_birth"),
  seatNumber: text("seat_number"),
  flightNumber: text("flight_number").notNull(),
  departureCity: text("departure_city").notNull(),
  arrivalCity: text("arrival_city").notNull(),
  departureDate: text("departure_date").notNull(),
  ticketClass: text("ticket_class"),
  price: text("price"),
  status: text("status").default("confirmed"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});
