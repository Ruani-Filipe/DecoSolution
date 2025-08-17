/**
 * This is where you define your tools.
 *
 * Tools are the functions that will be available on your
 * MCP server. They can be called from any other Deco app
 * or from your front-end code via typed RPC. This is the
 * recommended way to build your Web App.
 *
 * @see https://docs.deco.page/en/guides/creating-tools/
 */
import { createPrivateTool, createTool } from "@deco/workers-runtime/mastra";
import { z } from "zod";
import type { Env } from "./main.ts";
import { todosTable, passengersTable } from "./schema.ts";
import { getDb } from "./db.ts";
import { eq } from "drizzle-orm";

/**
 * `createPrivateTool` is a wrapper around `createTool` that
 * will call `env.DECO_CHAT_REQUEST_CONTEXT.ensureAuthenticated`
 * before executing the tool.
 *
 * It automatically returns a 401 error if valid user credentials
 * are not present in the request. You can also call it manually
 * to get the user object.
 */
export const createGetUserTool = (env: Env) =>
  createPrivateTool({
    id: "GET_USER",
    description: "Get the current logged in user",
    inputSchema: z.object({}),
    outputSchema: z.object({
      id: z.string(),
      name: z.string().nullable(),
      avatar: z.string().nullable(),
      email: z.string(),
    }),
    execute: async () => {
      const user = env.DECO_CHAT_REQUEST_CONTEXT.ensureAuthenticated();

      if (!user) {
        throw new Error("User not found");
      }

      return {
        id: user.id,
        name: user.user_metadata.full_name,
        avatar: user.user_metadata.avatar_url,
        email: user.email,
      };
    },
  });

/**
 * This tool is declared as public and can be executed by anyone
 * that has access to your MCP server.
 */
export const createListTodosTool = (env: Env) =>
  createTool({
    id: "LIST_TODOS",
    description: "List all todos",
    inputSchema: z.object({}),
    outputSchema: z.object({
      todos: z.array(
        z.object({
          id: z.number(),
          title: z.string().nullable(),
          completed: z.boolean(),
        }),
      ),
    }),
    execute: async () => {
      const db = await getDb(env);
      const todos = await db.select().from(todosTable);
      return {
        todos: todos.map((todo) => ({
          ...todo,
          completed: todo.completed === 1,
        })),
      };
    },
  });

const TODO_GENERATION_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "The title of the todo",
    },
  },
  required: ["title"],
};

export const createGenerateTodoWithAITool = (env: Env) =>
  createPrivateTool({
    id: "GENERATE_TODO_WITH_AI",
    description: "Generate a todo with AI",
    inputSchema: z.object({}),
    outputSchema: z.object({
      todo: z.object({
        id: z.number(),
        title: z.string().nullable(),
        completed: z.boolean(),
      }),
    }),
    execute: async () => {
      const db = await getDb(env);
      const generatedTodo = await env.DECO_CHAT_WORKSPACE_API
        .AI_GENERATE_OBJECT({
          model: "openai:gpt-4.1-mini",
          messages: [
            {
              role: "user",
              content:
                "Generate a funny TODO title that i can add to my TODO list! Keep it short and sweet, a maximum of 10 words.",
            },
          ],
          temperature: 0.9,
          schema: TODO_GENERATION_SCHEMA,
        });

      const generatedTodoTitle = String(generatedTodo.object?.title);

      if (!generatedTodoTitle) {
        throw new Error("Failed to generate todo");
      }

      const todo = await db.insert(todosTable).values({
        title: generatedTodoTitle,
        completed: 0,
      }).returning({ id: todosTable.id });

      return {
        todo: {
          id: todo[0].id,
          title: generatedTodoTitle,
          completed: false,
        },
      };
    },
  });

export const createToggleTodoTool = (env: Env) =>
  createPrivateTool({
    id: "TOGGLE_TODO",
    description: "Toggle a todo's completion status",
    inputSchema: z.object({
      id: z.number(),
    }),
    outputSchema: z.object({
      todo: z.object({
        id: z.number(),
        title: z.string().nullable(),
        completed: z.boolean(),
      }),
    }),
    execute: async ({ context }) => {
      const db = await getDb(env);

      // First get the current todo
      const currentTodo = await db.select().from(todosTable).where(
        eq(todosTable.id, context.id),
      ).limit(1);

      if (currentTodo.length === 0) {
        throw new Error("Todo not found");
      }

      // Toggle the completed status
      const newCompletedStatus = currentTodo[0].completed === 1 ? 0 : 1;

      const updatedTodo = await db.update(todosTable)
        .set({ completed: newCompletedStatus })
        .where(eq(todosTable.id, context.id))
        .returning();

      return {
        todo: {
          id: updatedTodo[0].id,
          title: updatedTodo[0].title,
          completed: updatedTodo[0].completed === 1,
        },
      };
    },
  });

export const createDeleteTodoTool = (env: Env) =>
  createPrivateTool({
    id: "DELETE_TODO",
    description: "Delete a todo",
    inputSchema: z.object({
      id: z.number(),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      deletedId: z.number(),
    }),
    execute: async ({ context }) => {
      const db = await getDb(env);

      // First check if the todo exists
      const existingTodo = await db.select().from(todosTable).where(
        eq(todosTable.id, context.id),
      ).limit(1);

      if (existingTodo.length === 0) {
        throw new Error("Todo not found");
      }

      // Delete the todo
      await db.delete(todosTable).where(eq(todosTable.id, context.id));

      return {
        success: true,
        deletedId: context.id,
      };
    },
  });

export const createImportPassengersFromCSVTool = (env: Env) =>
  createTool({
    id: "IMPORT_PASSENGERS_FROM_CSV",
    description: "Import passenger data from CSV file into the database",
    inputSchema: z.object({
      csvContent: z.string().describe("CSV content as string"),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      importedCount: z.number(),
      message: z.string(),
    }),
    execute: async ({ context }) => {
      try {
        const db = await getDb(env);
        
        // Parse CSV content
        const lines = context.csvContent.trim().split('\n');
        const headers = lines[0].split(',');
        const dataLines = lines.slice(1);
        
        let importedCount = 0;
        
        for (const line of dataLines) {
          if (line.trim()) {
            const values = line.split(',');
            const passengerData = {
              firstName: values[0] || '',
              lastName: values[1] || '',
              email: values[2] || '',
              phone: values[3] || null,
              passportNumber: values[4] || null,
              nationality: values[5] || null,
              dateOfBirth: values[6] || null,
              seatNumber: values[7] || null,
              flightNumber: values[8] || '',
              departureCity: values[9] || '',
              arrivalCity: values[10] || '',
              departureDate: values[11] || '',
              ticketClass: values[12] || null,
              price: values[13] || null,
              status: values[14] || 'confirmed',
            };
            
            await db.insert(passengersTable).values(passengerData);
            importedCount++;
          }
        }
        
        return {
          success: true,
          importedCount,
          message: `Successfully imported ${importedCount} passengers from CSV`,
        };
      } catch (error) {
        console.error('Error importing CSV:', error);
        return {
          success: false,
          importedCount: 0,
          message: `Error importing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    },
  });

export const createGetPassengersTool = (env: Env) =>
  createTool({
    id: "GET_PASSENGERS",
    description: "Get all passengers from the database with optional filtering",
    inputSchema: z.object({
      flightNumber: z.string().optional().describe("Filter by flight number"),
      departureCity: z.string().optional().describe("Filter by departure city"),
      arrivalCity: z.string().optional().describe("Filter by arrival city"),
      ticketClass: z.string().optional().describe("Filter by ticket class"),
      status: z.string().optional().describe("Filter by status"),
      limit: z.number().optional().describe("Limit number of results"),
    }),
    outputSchema: z.object({
      passengers: z.array(
        z.object({
          id: z.number(),
          firstName: z.string(),
          lastName: z.string(),
          email: z.string(),
          phone: z.string().nullable(),
          passportNumber: z.string().nullable(),
          nationality: z.string().nullable(),
          dateOfBirth: z.string().nullable(),
          seatNumber: z.string().nullable(),
          flightNumber: z.string(),
          departureCity: z.string(),
          arrivalCity: z.string(),
          departureDate: z.string(),
          ticketClass: z.string().nullable(),
          price: z.string().nullable(),
          status: z.string().nullable(),
          createdAt: z.string().nullable(),
        })
      ),
      totalCount: z.number(),
      message: z.string(),
    }),
    execute: async ({ context }) => {
      try {
        const db = await getDb(env);
        
        // Get all passengers first
        let passengers = await db.select().from(passengersTable);
        
        // Apply filters in memory for simplicity
        if (context.flightNumber) {
          passengers = passengers.filter(p => p.flightNumber === context.flightNumber);
        }
        if (context.departureCity) {
          passengers = passengers.filter(p => p.departureCity === context.departureCity);
        }
        if (context.arrivalCity) {
          passengers = passengers.filter(p => p.arrivalCity === context.arrivalCity);
        }
        if (context.ticketClass) {
          passengers = passengers.filter(p => p.ticketClass === context.ticketClass);
        }
        if (context.status) {
          passengers = passengers.filter(p => p.status === context.status);
        }
        
        // Apply limit if provided
        if (context.limit) {
          passengers = passengers.slice(0, context.limit);
        }
        
        return {
          passengers,
          totalCount: passengers.length,
          message: `Retrieved ${passengers.length} passengers from database`,
        };
      } catch (error) {
        console.error('Error fetching passengers:', error);
        throw new Error(`Error fetching passengers: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  });

export const createGetPassengerStatsTool = (env: Env) =>
  createTool({
    id: "GET_PASSENGER_STATS",
    description: "Get statistics about passengers in the database",
    inputSchema: z.object({}),
    outputSchema: z.object({
      totalPassengers: z.number(),
      byTicketClass: z.record(z.number()),
      byStatus: z.record(z.number()),
      byFlight: z.record(z.number()),
      averagePrice: z.number(),
      message: z.string(),
    }),
    execute: async () => {
      try {
        const db = await getDb(env);
        
        // Get all passengers for analysis
        const allPassengers = await db.select().from(passengersTable);
        
        if (allPassengers.length === 0) {
          return {
            totalPassengers: 0,
            byTicketClass: {},
            byStatus: {},
            byFlight: {},
            averagePrice: 0,
            message: "No passengers found in database",
          };
        }
        
        // Calculate statistics
        const byTicketClass: Record<string, number> = {};
        const byStatus: Record<string, number> = {};
        const byFlight: Record<string, number> = {};
        let totalPrice = 0;
        let validPrices = 0;
        
        for (const passenger of allPassengers) {
          // Count by ticket class
          const ticketClass = passenger.ticketClass || 'unknown';
          byTicketClass[ticketClass] = (byTicketClass[ticketClass] || 0) + 1;
          
          // Count by status
          const status = passenger.status || 'unknown';
          byStatus[status] = (byStatus[status] || 0) + 1;
          
          // Count by flight
          const flight = passenger.flightNumber || 'unknown';
          byFlight[flight] = (byFlight[flight] || 0) + 1;
          
          // Calculate average price
          if (passenger.price) {
            const price = parseFloat(passenger.price);
            if (!isNaN(price)) {
              totalPrice += price;
              validPrices++;
            }
          }
        }
        
        const averagePrice = validPrices > 0 ? totalPrice / validPrices : 0;
        
        return {
          totalPassengers: allPassengers.length,
          byTicketClass,
          byStatus,
          byFlight,
          averagePrice: Math.round(averagePrice * 100) / 100, // Round to 2 decimal places
          message: `Statistics calculated for ${allPassengers.length} passengers`,
        };
      } catch (error) {
        console.error('Error calculating passenger stats:', error);
        throw new Error(`Error calculating passenger stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  });

export const createPopulateTestDataTool = (env: Env) =>
  createTool({
    id: "POPULATE_TEST_DATA",
    description: "Populate the database with test passenger data from the sample CSV",
    inputSchema: z.object({}),
    outputSchema: z.object({
      success: z.boolean(),
      importedCount: z.number(),
      message: z.string(),
    }),
    execute: async () => {
      try {
        const db = await getDb(env);
        
        // Check if data already exists
        const existingPassengers = await db.select().from(passengersTable).limit(1);
        if (existingPassengers.length > 0) {
          return {
            success: true,
            importedCount: 0,
            message: "Database already contains passenger data. Use GET_PASSENGERS to retrieve data.",
          };
        }
        
        // Sample CSV data (same as in the file)
        const csvData = `firstName,lastName,email,phone,passportNumber,nationality,dateOfBirth,seatNumber,flightNumber,departureCity,arrivalCity,departureDate,ticketClass,price,status
João,Silva,joao.silva@email.com,+55 11 99999-1111,BR123456,brasileiro,1985-03-15,12A,LA1234,São Paulo,Los Angeles,2024-01-15,economy,2500.00,confirmed
Maria,Santos,maria.santos@email.com,+55 21 88888-2222,BR789012,brasileira,1990-07-22,15B,LA1234,São Paulo,Los Angeles,2024-01-15,business,4500.00,confirmed
Carlos,Oliveira,carlos.oliveira@email.com,+55 31 77777-3333,BR345678,brasileiro,1988-11-08,18C,LA1234,São Paulo,Los Angeles,2024-01-15,economy,2500.00,confirmed
Ana,Costa,ana.costa@email.com,+55 41 66666-4444,BR901234,brasileira,1992-04-30,22D,LA1234,São Paulo,Los Angeles,2024-01-15,economy,2500.00,confirmed
Pedro,Ferreira,pedro.ferreira@email.com,+55 51 55555-5555,BR567890,brasileiro,1983-09-12,25E,LA1234,São Paulo,Los Angeles,2024-01-15,first,6500.00,confirmed
Lucia,Ribeiro,lucia.ribeiro@email.com,+55 61 44444-6666,BR234567,brasileira,1987-12-05,28F,LA1234,São Paulo,Los Angeles,2024-01-15,economy,2500.00,confirmed
Roberto,Almeida,roberto.almeida@email.com,+55 71 33333-7777,BR890123,brasileiro,1981-06-18,31G,LA1234,São Paulo,Los Angeles,2024-01-15,business,4500.00,confirmed
Fernanda,Lima,fernanda.lima@email.com,+55 81 22222-8888,BR456789,brasileira,1995-01-25,34H,LA1234,São Paulo,Los Angeles,2024-01-15,economy,2500.00,confirmed
Marcos,Pereira,marcos.pereira@email.com,+55 91 11111-9999,BR012345,brasileiro,1986-08-14,37I,LA1234,São Paulo,Los Angeles,2024-01-15,economy,2500.00,confirmed
Juliana,Martins,juliana.martins@email.com,+55 11 00000-0000,BR678901,brasileira,1993-05-20,40J,LA1234,São Paulo,Los Angeles,2024-01-15,business,4500.00,confirmed`;
        
        // Parse CSV content
        const lines = csvData.trim().split('\n');
        const dataLines = lines.slice(1); // Skip header
        
        let importedCount = 0;
        
        for (const line of dataLines) {
          if (line.trim()) {
            const values = line.split(',');
            const passengerData = {
              firstName: values[0] || '',
              lastName: values[1] || '',
              email: values[2] || '',
              phone: values[3] || null,
              passportNumber: values[4] || null,
              nationality: values[5] || null,
              dateOfBirth: values[6] || null,
              seatNumber: values[7] || null,
              flightNumber: values[8] || '',
              departureCity: values[9] || '',
              arrivalCity: values[10] || '',
              departureDate: values[11] || '',
              ticketClass: values[12] || null,
              price: values[13] || null,
              status: values[14] || 'confirmed',
            };
            
            await db.insert(passengersTable).values(passengerData);
            importedCount++;
          }
        }
        
        return {
          success: true,
          importedCount,
          message: `Successfully populated database with ${importedCount} test passengers`,
        };
      } catch (error) {
        console.error('Error populating test data:', error);
        return {
          success: false,
          importedCount: 0,
          message: `Error populating test data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    },
  });

export const tools = [
  createGetUserTool,
  createListTodosTool,
  createGenerateTodoWithAITool,
  createToggleTodoTool,
  createDeleteTodoTool,
  createImportPassengersFromCSVTool,
  createGetPassengersTool,
  createGetPassengerStatsTool,
  createPopulateTestDataTool,
];
