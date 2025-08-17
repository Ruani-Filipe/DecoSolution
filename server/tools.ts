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
import { todosTable , passengersTable } from "./schema.ts";
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

export const createGetPassengersTool = (env: Env) =>
  createTool({
    id: "GET_PASSENGERS",
    description: "Get all passengers from the database with optional filtering",
    inputSchema: z.object({
      flightNumber: z.string().optional().describe("Filter by flight number"),
      departureCity: z.string().optional().describe("Filter by departure city"),
      arrivalCity: z.string().optional().describe("Filter by arrival city"),
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
          nationality: z.string(),
          dateOfBirth: z.string(),
          departureCity: z.string(),
          arrivalCity: z.string(),
          departureDate: z.string(),
          distance: z.string(),
          flightCost: z.string(),
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
        if (context.status) {
          passengers = passengers.filter(p => p.status === context.status);
        }
        
        // Apply limit if provided
        if (context.limit) {
          passengers = passengers.slice(0, context.limit);
        }
        
        // Clean and normalize passenger data to match CSV columns
        const cleanedPassengers = passengers.map(passenger => ({
          id: passenger.id,
          firstName: passenger.firstName || '',
          lastName: passenger.lastName || '',
          email: passenger.email || '',
          nationality: passenger.nationality || '',
          dateOfBirth: passenger.dateOfBirth || '',
          departureCity: passenger.departureCity || '',
          arrivalCity: passenger.arrivalCity || '',
          departureDate: passenger.departureDate || '',
          distance: passenger.distance || '',
          flightCost: passenger.price || '', // Map price to flightCost
        }));
        
        return {
          passengers: cleanedPassengers,
          totalCount: cleanedPassengers.length,
          message: `Retrieved ${cleanedPassengers.length} passengers from database`,
        };
      } catch (error) {
        console.error('Error fetching passengers:', error);
        throw new Error(`Error fetching passengers: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  });

export const createClearDatabaseTool = (env: Env) =>
  createTool({
    id: "CLEAR_DATABASE",
    description: "Clear all passenger data from the database",
    inputSchema: z.object({}),
    outputSchema: z.object({
      success: z.boolean(),
      deletedCount: z.number(),
      message: z.string(),
    }),
    execute: async () => {
      try {
        const db = await getDb(env);
        
        // Get count before deletion
        const existingPassengers = await db.select().from(passengersTable);
        const deletedCount = existingPassengers.length;
        
        if (deletedCount === 0) {
          return {
            success: true,
            deletedCount: 0,
            message: "Database is already empty",
          };
        }
        
        // Delete all passengers
        await db.delete(passengersTable);
        
        return {
          success: true,
          deletedCount,
          message: `Successfully cleared database. Deleted ${deletedCount} passengers.`,
        };
      } catch (error) {
        console.error('Error clearing database:', error);
        return {
          success: false,
          deletedCount: 0,
          message: `Error clearing database: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    },
  });

  export const createPopulateTestDataTool = (env: Env) =>
    createTool({
      id: "POPULATE_TEST_DATA",
      description: "Populate the database with test passenger data from the sample CSV file",
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
          if (await hasExistingData(db)) {
            return {
              success: true,
              importedCount: 0,
              message: "Database already contains passenger data. Use CLEAR_DATABASE to clear it first, then POPULATE_TEST_DATA to populate again.",
            };
          }
          
          // Get CSV data and parse
          const csvContent = getCSVContent();
          const passengers = parseCSVContent(csvContent);
          
          // Insert passengers into database
          const importedCount = await insertPassengers(db, passengers);
          
          console.log(`\n--- Import Summary ---`);
          console.log(`Total passengers imported: ${importedCount}`);
          
          return {
            success: true,
            importedCount,
            message: `Successfully populated database with ${importedCount} test passengers from hardcoded CSV data`,
          };
        } catch (error) {
          console.error('❌ Error populating test data:', error);
          return {
            success: false,
            importedCount: 0,
            message: `Error populating test data: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    });
  
  // Helper functions
  const hasExistingData = async (db: any): Promise<boolean> => {
    const existingPassengers = await db.select().from(passengersTable).limit(1);
    return existingPassengers.length > 0;
  };
  
  const getCSVContent = (): string => {
    return `firstName,lastName,email,nationality,dateOfBirth,departureCity,arrivalCity,departureDate,distance,flightCost
  João,Silva,joao.silva@email.com,Brazilian,1985-03-15,São Paulo,Rio de Janeiro,2024-01-15,430,1200.00
Maria,Santos,maria.santos@email.com,Brazilian,1990-07-22,Brasília,Salvador,2024-01-16,1200,2800.00
Carlos,Oliveira,carlos.oliveira@email.com,Brazilian,1988-11-08,Recife,Fortaleza,2024-01-17,800,1900.00
Ana,Costa,ana.costa@email.com,Brazilian,1992-04-30,Porto Alegre,Curitiba,2024-01-18,350,950.00
Pedro,Ferreira,pedro.ferreira@email.com,Brazilian,1983-09-12,Manaus,Belém,2024-01-19,1300,3100.00
Lucia,Ribeiro,lucia.ribeiro@email.com,Brazilian,1987-12-05,Goiânia,Cuiabá,2024-01-20,950,2200.00
Roberto,Almeida,roberto.almeida@email.com,Brazilian,1981-06-18,Campo Grande,Porto Velho,2024-01-21,1800,4200.00
Fernanda,Lima,fernanda.lima@email.com,Brazilian,1995-01-25,Teresina,Aracaju,2024-01-22,1100,2600.00
Marcos,Pereira,marcos.pereira@email.com,Brazilian,1986-08-14,João Pessoa,Natal,2024-01-23,180,650.00
Juliana,Martins,juliana.martins@email.com,Brazilian,1993-05-20,Vitória,Palmas,2024-01-24,1400,3300.00
Ana,Silva,ana.silva@email.com,Brazilian,1990-03-15,São Paulo,Rio de Janeiro,2025-09-01,357,350
Pedro,Santos,pedro.santos@email.com,Brazilian,1985-07-22,Rio de Janeiro,Belo Horizonte,2025-09-05,339,320
Maria,Oliveira,maria.oliveira@email.com,Brazilian,1992-11-01,Belo Horizonte,Brasília,2025-09-10,586,450
João,Costa,joao.costa@email.com,Brazilian,1988-04-20,Brasília,Curitiba,2025-09-15,935,680
Julia,Souza,julia.souza@email.com,Brazilian,1995-01-30,Curitiba,Porto Alegre,2025-09-20,609,520
Lucas,Pereira,lucas.pereira@email.com,Brazilian,1980-09-12,Porto Alegre,São Paulo,2025-09-25,851,600
Mariana,Almeida,mariana.almeida@email.com,Brazilian,1993-06-08,Salvador,Recife,2025-09-30,680,500
Gabriel,Ferreira,gabriel.ferreira@email.com,Brazilian,1987-02-18,Fortaleza,Natal,2025-10-01,430,400
Larissa,Martins,larissa.martins@email.com,Brazilian,1991-10-05,Recife,Manaus,2025-10-05,2666,1200
Rafael,Rodrigues,rafael.rodrigues@email.com,Brazilian,1986-12-28,Manaus,Salvador,2025-10-10,2697,1250
Fernanda,Lima,fernanda.lima@email.com,Brazilian,1994-08-10,Florianópolis,Porto Alegre,2025-10-15,380,380
Bruno,Gomes,bruno.gomes@email.com,Brazilian,1989-05-03,Vitória,Rio de Janeiro,2025-10-20,426,410
Carolina,Carvalho,carolina.carvalho@email.com,Brazilian,1990-03-15,Goiânia,Brasília,2025-10-25,163,250
Daniel,Melo,daniel.melo@email.com,Brazilian,1985-07-22,Campo Grande,Cuiabá,2025-10-30,408,390
Isabela,Ribeiro,isabela.ribeiro@email.com,Brazilian,1992-11-01,Belém,São Luís,2025-11-01,403,400
Guilherme,Dias,guilherme.dias@email.com,Brazilian,1988-04-20,Natal,Recife,2025-11-05,280,300
Laura,Castro,laura.castro@email.com,Brazilian,1995-01-30,João Pessoa,Maceió,2025-11-10,465,420
Diego,Nunes,diego.nunes@email.com,Brazilian,1980-09-12,Maceió,Salvador,2025-11-15,260,280
Vitoria,Rosa,vitoria.rosa@email.com,Brazilian,1993-06-08,São Paulo,Fortaleza,2025-11-20,2362,1100
André,Campos,andre.campos@email.com,Brazilian,1987-02-18,Rio de Janeiro,Recife,2025-11-25,1860,900
Sophie,Dubois,sophie.dubois@email.com,French,1978-01-01,Belo Horizonte,Manaus,2025-12-01,2838,1300
Marc,Durand,marc.durand@email.com,French,1982-02-10,Brasília,Belém,2025-12-05,1593,850
Emily,Brown,emily.brown@email.com,American,1990-03-15,Curitiba,Campo Grande,2025-12-10,950,700
Daniel,White,daniel.white@email.com,American,1985-07-22,Porto Alegre,Vitória,2025-12-15,1600,900
Hannah,Green,hannah.green@email.com,British,1992-11-01,Salvador,João Pessoa,2025-12-20,700,550
Mohammed,Khan,mohammed.khan@email.com,Indian,1988-04-20,Fortaleza,Cuiabá,2025-12-25,2800,1200
Isabelle,Lefevre,isabelle.lefevre@email.com,French,1995-01-30,Recife,Goiânia,2026-01-01,1900,950
Ahmed,Ali,ahmed.ali@email.com,Egyptian,1980-09-12,Manaus,São Luís,2026-01-05,2000,1000
Olivia,Taylor,olivia.taylor@email.com,British,1993-06-08,Florianópolis,Brasília,2026-01-10,1100,750
Liam,Murphy,liam.murphy@email.com,Irish,1987-02-18,Vitória,Curitiba,2026-01-15,1200,800
Sarah,Jones,sarah.jones@email.com,American,1991-10-05,Goiânia,Salvador,2026-01-20,1400,880
Chloe,Martin,chloe.martin@email.com,French,1986-12-28,Campo Grande,Natal,2026-01-25,2600,1150
Sophie,Smith,sophie.smith@email.com,American,1994-08-10,Belém,Recife,2026-01-30,1600,900
Leo,Dubois,leo.dubois@email.com,French,1989-05-03,São Luís,Manaus,2026-02-01,2000,1000
Mia,Williams,mia.williams@email.com,British,1990-03-15,Natal,Maceió,2026-02-05,600,480
Noah,Miller,noah.miller@email.com,American,1985-07-22,João Pessoa,Fortaleza,2026-02-10,530,450
Emma,García,emma.garcia@email.com,Spanish,1992-11-01,Maceió,Belo Horizonte,2026-02-15,1300,850
Benjamin,Davis,benjamin.davis@email.com,American,1988-04-20,São Paulo,Campo Grande,2026-02-20,870,650
Ava,Johnson,ava.johnson@email.com,American,1995-01-30,Rio de Janeiro,Goiânia,2026-02-25,900,680
Lucas,Perez,lucas.perez@email.com,Spanish,1980-09-12,Belo Horizonte,Belém,2026-03-01,2000,1000
Isabella,Conti,isabella.conti@email.com,Italian,1993-06-08,Brasília,São Luís,2026-03-05,1500,850
William,Brown,william.brown@email.com,British,1987-02-18,Curitiba,Natal,2026-03-10,2700,1200
Sophia,Rossi,sophia.rossi@email.com,Italian,1991-10-05,Porto Alegre,Maceió,2026-03-15,2700,1200
James,Wilson,james.wilson@email.com,American,1986-12-28,Salvador,Florianópolis,2026-03-20,1600,900
Amelia,Moore,amelia.moore@email.com,American,1994-08-10,Fortaleza,Vitória,2026-03-25,1900,980
Evelyn,Hall,evelyn.hall@email.com,American,1989-05-03,Recife,Goiânia,2026-03-30,1900,950
Michael,King,michael.king@email.com,American,1990-03-15,Manaus,Fortaleza,2026-04-01,2380,1100
Ethan,Wright,ethan.wright@email.com,American,1985-07-22,Florianópolis,São Paulo,2026-04-05,480,420
Abigail,Lopez,abigail.lopez@email.com,Spanish,1992-11-01,Vitória,Salvador,2026-04-10,700,580
Alexander,Hill,alexander.hill@email.com,American,1988-04-20,Goiânia,Manaus,2026-04-15,2280,1050
Charlotte,Scott,charlotte.scott@email.com,American,1995-01-30,Campo Grande,Goiânia,2026-04-20,734,550
Henry,Adams,henry.adams@email.com,American,1980-09-12,Belém,Fortaleza,2026-04-25,1315,800
Ella,Baker,ella.baker@email.com,American,1993-06-08,São Luís,Belém,2026-04-30,403,400
Sebastian,Nelson,sebastian.nelson@email.com,American,1987-02-18,Natal,João Pessoa,2026-05-01,170,250
Grace,Carter,grace.carter@email.com,American,1991-10-05,João Pessoa,Recife,2026-05-05,108,200
Samuel,Roberts,samuel.roberts@email.com,American,1986-12-28,Maceió,Recife,2026-05-10,200,280
Lily,Phillips,lily.phillips@email.com,American,1994-08-10,São Paulo,Recife,2026-05-15,2122,1000
Joseph,Campbell,joseph.campbell@email.com,American,1989-05-03,Rio de Janeiro,Brasília,2026-05-20,936,700
Chloe,Parker,chloe.parker@email.com,American,1990-03-15,Belo Horizonte,Rio de Janeiro,2026-05-25,339,330
David,Evans,david.evans@email.com,American,1985-07-22,Brasília,Manaus,2026-05-30,2699,1200
Zoe,Collins,zoe.collins@email.com,American,1992-11-01,Curitiba,Salvador,2026-06-01,1842,950
Andrew,Stewart,andrew.stewart@email.com,American,1988-04-20,Porto Alegre,Recife,2026-06-05,2808,1250
Ella,Ramirez,ella.ramirez@email.com,Spanish,1995-01-30,Salvador,São Paulo,2026-06-10,1450,850
Mason,Sanchez,mason.sanchez@email.com,Spanish,1980-09-12,Fortaleza,Belém,2026-06-15,1315,800
Grace,Morris,grace.morris@email.com,American,1993-06-08,Recife,João Pessoa,2026-06-20,108,220
Leo,Fisher,leo.fisher@email.com,American,1987-02-18,Manaus,Florianópolis,2026-06-25,3107,1350
Victoria,Gonzales,victoria.gonzales@email.com,Spanish,1991-10-05,Florianópolis,Porto Alegre,2026-06-30,380,390
Avery,Cooper,avery.cooper@email.com,American,1986-12-28,Vitória,Rio de Janeiro,2026-07-01,426,410
Sofia,Rivera,sofia.rivera@email.com,Spanish,1994-08-10,Goiânia,Brasília,2026-07-05,163,260
Penelope,Kelly,penelope.kelly@email.com,American,1989-05-03,Campo Grande,Cuiabá,2026-07-10,408,400
Carter,Howard,carter.howard@email.com,American,1990-03-15,Belém,São Luís,2026-07-15,403,400
Layla,Ward,layla.ward@email.com,American,1985-07-22,Natal,Recife,2026-07-20,280,310
Ezra,Cox,ezra.cox@email.com,American,1992-11-01,João Pessoa,Maceió,2026-07-25,465,430
Riley,Brooks,riley.brooks@email.com,American,1988-04-20,Maceió,Salvador,2026-07-30,260,290
Nora,Bennett,nora.bennett@email.com,American,1995-01-30,São Paulo,Rio de Janeiro,2026-08-01,357,360
Ana,Silva,ana.silva@email.com,Brazilian,1990-03-15,São Paulo,Rio de Janeiro,2025-09-01,357,350
Pedro,Santos,pedro.santos@email.com,Brazilian,1985-07-22,Rio de Janeiro,Belo Horizonte,2025-09-05,339,320
Maria,Oliveira,maria.oliveira@email.com,Brazilian,1992-11-01,Belo Horizonte,Brasília,2025-09-10,586,450
João,Costa,joao.costa@email.com,Brazilian,1988-04-20,Brasília,Curitiba,2025-09-15,935,680
Julia,Souza,julia.souza@email.com,Brazilian,1995-01-30,Curitiba,Porto Alegre,2025-09-20,609,520
Lucas,Pereira,lucas.pereira@email.com,Brazilian,1980-09-12,Porto Alegre,São Paulo,2025-09-25,851,600
Mariana,Almeida,mariana.almeida@email.com,Brazilian,1993-06-08,Salvador,Recife,2025-09-30,680,500
Gabriel,Ferreira,gabriel.ferreira@email.com,Brazilian,1987-02-18,Fortaleza,Natal,2025-10-01,430,400
Larissa,Martins,larissa.martins@email.com,Brazilian,1991-10-05,Recife,Manaus,2025-10-05,2666,1200
Rafael,Rodrigues,rafael.rodrigues@email.com,Brazilian,1986-12-28,Manaus,Salvador,2025-10-10,2697,1250
Fernanda,Lima,fernanda.lima@email.com,Brazilian,1994-08-10,Florianópolis,Porto Alegre,2025-10-15,380,380
Bruno,Gomes,bruno.gomes@email.com,Brazilian,1989-05-03,Vitória,Rio de Janeiro,2025-10-20,426,410
Carolina,Carvalho,carolina.carvalho@email.com,Brazilian,1990-03-15,Goiânia,Brasília,2025-10-25,163,250
Daniel,Melo,daniel.melo@email.com,Brazilian,1985-07-22,Campo Grande,Cuiabá,2025-10-30,408,390
Isabela,Ribeiro,isabela.ribeiro@email.com,Brazilian,1992-11-01,Belém,São Luís,2025-11-01,403,400
Guilherme,Dias,guilherme.dias@email.com,Brazilian,1988-04-20,Natal,Recife,2025-11-05,280,300
Laura,Castro,laura.castro@email.com,Brazilian,1995-01-30,João Pessoa,Maceió,2025-11-10,465,420
Diego,Nunes,diego.nunes@email.com,Brazilian,1980-09-12,Maceió,Salvador,2025-11-15,260,280
Vitoria,Rosa,vitoria.rosa@email.com,Brazilian,1993-06-08,São Paulo,Fortaleza,2025-11-20,2362,1100
André,Campos,andre.campos@email.com,Brazilian,1987-02-18,Rio de Janeiro,Recife,2025-11-25,1860,900
Sophie,Dubois,sophie.dubois@email.com,French,1978-01-01,Belo Horizonte,Manaus,2025-12-01,2838,1300
Marc,Durand,marc.durand@email.com,French,1982-02-10,Brasília,Belém,2025-12-05,1593,850
Emily,Brown,emily.brown@email.com,American,1990-03-15,Curitiba,Campo Grande,2025-12-10,950,700
Daniel,White,daniel.white@email.com,American,1985-07-22,Porto Alegre,Vitória,2025-12-15,1600,900
Hannah,Green,hannah.green@email.com,British,1992-11-01,Salvador,João Pessoa,2025-12-20,700,550
Mohammed,Khan,mohammed.khan@email.com,Indian,1988-04-20,Fortaleza,Cuiabá,2025-12-25,2800,1200
Isabelle,Lefevre,isabelle.lefevre@email.com,French,1995-01-30,Recife,Goiânia,2026-01-01,1900,950
Ahmed,Ali,ahmed.ali@email.com,Egyptian,1980-09-12,Manaus,São Luís,2026-01-05,2000,1000
Olivia,Taylor,olivia.taylor@email.com,British,1993-06-08,Florianópolis,Brasília,2026-01-10,1100,750
Liam,Murphy,liam.murphy@email.com,Irish,1987-02-18,Vitória,Curitiba,2026-01-15,1200,800
Sarah,Jones,sarah.jones@email.com,American,1991-10-05,Goiânia,Salvador,2026-01-20,1400,880
Chloe,Martin,chloe.martin@email.com,French,1986-12-28,Campo Grande,Natal,2026-01-25,2600,1150
Sophie,Smith,sophie.smith@email.com,American,1994-08-10,Belém,Recife,2026-01-30,1600,900
Leo,Dubois,leo.dubois@email.com,French,1989-05-03,São Luís,Manaus,2026-02-01,2000,1000
Mia,Williams,mia.williams@email.com,British,1990-03-15,Natal,Maceió,2026-02-05,600,480
Noah,Miller,noah.miller@email.com,American,1985-07-22,João Pessoa,Fortaleza,2026-02-10,530,450
Emma,García,emma.garcia@email.com,Spanish,1992-11-01,Maceió,Belo Horizonte,2026-02-15,1300,850
Benjamin,Davis,benjamin.davis@email.com,American,1988-04-20,São Paulo,Campo Grande,2026-02-20,870,650
Ava,Johnson,ava.johnson@email.com,American,1995-01-30,Rio de Janeiro,Goiânia,2026-02-25,900,680
Lucas,Perez,lucas.perez@email.com,Spanish,1980-09-12,Belo Horizonte,Belém,2026-03-01,2000,1000
Isabella,Conti,isabella.conti@email.com,Italian,1993-06-08,Brasília,São Luís,2026-03-05,1500,850
William,Brown,william.brown@email.com,British,1987-02-18,Curitiba,Natal,2026-03-10,2700,1200
Sophia,Rossi,sophia.rossi@email.com,Italian,1991-10-05,Porto Alegre,Maceió,2026-03-15,2700,1200
James,Wilson,james.wilson@email.com,American,1986-12-28,Salvador,Florianópolis,2026-03-20,1600,900
Amelia,Moore,amelia.moore@email.com,American,1994-08-10,Fortaleza,Vitória,2026-03-25,1900,980
Evelyn,Hall,evelyn.hall@email.com,American,1989-05-03,Recife,Goiânia,2026-03-30,1900,950
Michael,King,michael.king@email.com,American,1990-03-15,Manaus,Fortaleza,2026-04-01,2380,1100
Ethan,Wright,ethan.wright@email.com,American,1985-07-22,Florianópolis,São Paulo,2026-04-05,480,420
Abigail,Lopez,abigail.lopez@email.com,Spanish,1992-11-01,Vitória,Salvador,2026-04-10,700,580
Alexander,Hill,alexander.hill@email.com,American,1988-04-20,Goiânia,Manaus,2026-04-15,2280,1050
Charlotte,Scott,charlotte.scott@email.com,American,1995-01-30,Campo Grande,Goiânia,2026-04-20,734,550
Henry,Adams,henry.adams@email.com,American,1980-09-12,Belém,Fortaleza,2026-04-25,1315,800
Ella,Baker,ella.baker@email.com,American,1993-06-08,São Luís,Belém,2026-04-30,403,400
Sebastian,Nelson,sebastian.nelson@email.com,American,1987-02-18,Natal,João Pessoa,2026-05-01,170,250
Grace,Carter,grace.carter@email.com,American,1991-10-05,João Pessoa,Recife,2026-05-05,108,200
Samuel,Roberts,samuel.roberts@email.com,American,1986-12-28,Maceió,Recife,2026-05-10,200,280
Lily,Phillips,lily.phillips@email.com,American,1994-08-10,São Paulo,Recife,2026-05-15,2122,1000
Joseph,Campbell,joseph.campbell@email.com,American,1989-05-03,Rio de Janeiro,Brasília,2026-05-20,936,700
Chloe,Parker,chloe.parker@email.com,American,1990-03-15,Belo Horizonte,Rio de Janeiro,2026-05-25,339,330
David,Evans,david.evans@email.com,American,1985-07-22,Brasília,Manaus,2026-05-30,2699,1200
Zoe,Collins,zoe.collins@email.com,American,1992-11-01,Curitiba,Salvador,2026-06-01,1842,950
Andrew,Stewart,andrew.stewart@email.com,American,1988-04-20,Porto Alegre,Recife,2026-06-05,2808,1250
Ella,Ramirez,ella.ramirez@email.com,Spanish,1995-01-30,Salvador,São Paulo,2026-06-10,1450,850
Mason,Sanchez,mason.sanchez@email.com,Spanish,1980-09-12,Fortaleza,Belém,2026-06-15,1315,800
Grace,Morris,grace.morris@email.com,American,1993-06-08,Recife,João Pessoa,2026-06-20,108,220
Leo,Fisher,leo.fisher@email.com,American,1987-02-18,Manaus,Florianópolis,2026-06-25,3107,1350
Victoria,Gonzales,victoria.gonzales@email.com,Spanish,1991-10-05,Florianópolis,Porto Alegre,2026-06-30,380,390
Avery,Cooper,avery.cooper@email.com,American,1986-12-28,Vitória,Rio de Janeiro,2026-07-01,426,410
Sofia,Rivera,sofia.rivera@email.com,Spanish,1994-08-10,Goiânia,Brasília,2026-07-05,163,260
Penelope,Kelly,penelope.kelly@email.com,American,1989-05-03,Campo Grande,Cuiabá,2026-07-10,408,400
Carter,Howard,carter.howard@email.com,American,1990-03-15,Belém,São Luís,2026-07-15,403,400
Layla,Ward,layla.ward@email.com,American,1985-07-22,Natal,Recife,2026-07-20,280,310
Ezra,Cox,ezra.cox@email.com,American,1992-11-01,João Pessoa,Maceió,2026-07-25,465,430
Riley,Brooks,riley.brooks@email.com,American,1988-04-20,Maceió,Salvador,2026-07-30,260,290
Nora,Bennett,nora.bennett@email.com,American,1995-01-30,São Paulo,Rio de Janeiro,2026-08-01,357,360
Owen,Reed,owen.reed@email.com,American,1980-09-12,Rio de Janeiro,Belo Horizonte,2026-08-05,339,325
Scarlett,Cook,scarlett.cook@email.com,American,1993-06-08,Belo Horizonte,Brasília,2026-08-10,586,455
Caleb,Morgan,caleb.morgan@email.com,American,1987-02-18,Brasília,Curitiba,2026-08-15,935,685
Madeline,Bell,madeline.bell@email.com,American,1991-10-05,Curitiba,Porto Alegre,2026-08-20,609,525
Jonathan,Murphy,jonathan.murphy@email.com,Irish,1986-12-28,Porto Alegre,São Paulo,2026-08-25,851,605
Lillian,Bailey,lillian.bailey@email.com,American,1994-08-10,Salvador,Recife,2026-08-30,680,505
Jaxon,Garcia,jaxon.garcia@email.com,Spanish,1989-05-03,Fortaleza,Natal,2026-09-01,430,405
Natalie,White,natalie.white@email.com,American,1990-03-15,Recife,Manaus,2026-09-05,2666,1205
Isaiah,Kelly,isaiah.kelly@email.com,American,1985-07-22,Manaus,Salvador,2026-09-10,2697,1255
Mia,Ramirez,mia.ramirez@email.com,Spanish,1992-11-01,Florianópolis,Porto Alegre,2026-09-15,380,385
Luna,King,luna.king@email.com,American,1988-04-20,Vitória,Rio de Janeiro,2026-09-20,426,415
Asher,Parker,asher.parker@email.com,American,1995-01-30,Goiânia,Brasília,2026-09-25,163,255
Skylar,Stewart,skylar.stewart@email.com,American,1980-09-12,Campo Grande,Cuiabá,2026-09-30,408,395
Violet,Cruz,violet.cruz@email.com,Spanish,1993-06-08,Belém,São Luís,2026-10-01,403,405
Brooks,Edwards,brooks.edwards@email.com,American,1987-02-18,Natal,Recife,2026-10-05,280,305
Aurora,Gonzales,aurora.gonzales@email.com,Spanish,1991-10-05,João Pessoa,Maceió,2026-10-10,465,425
Silas,Turner,silas.turner@email.com,American,1986-12-28,Maceió,Salvador,2026-10-15,260,285
Everly,Mitchell,everly.mitchell@email.com,American,1994-08-10,São Paulo,Fortaleza,2026-10-20,2362,1105
Declan,Phillips,declan.phillips@email.com,American,1989-05-03,Rio de Janeiro,Recife,2026-10-25,1860,905
Willow,Rivera,willow.rivera@email.com,Spanish,1990-03-15,Belo Horizonte,Manaus,2026-10-30,2838,1305
Ezra,Wood,ezra.wood@email.com,American,1985-07-22,Brasília,Belém,2026-11-01,1593,855
Adeline,Barnes,adeline.barnes@email.com,American,1992-11-01,Curitiba,Campo Grande,2026-11-05,950,705
Grayson,Ross,grayson.ross@email.com,American,1988-04-20,Porto Alegre,Vitória,2026-11-10,1600,905
Eliza,Henderson,eliza.henderson@email.com,American,1995-01-30,Salvador,João Pessoa,2026-11-15,700,555
Harrison,Coleman,harrison.coleman@email.com,American,1980-09-12,Fortaleza,Cuiabá,2026-11-20,2800,1205
Maya,Jenkins,maya.jenkins@email.com,American,1993-06-08,Recife,Goiânia,2026-11-25,1900,955
Leo,Perez,leo.perez@email.com,Spanish,1987-02-18,Manaus,São Luís,2026-11-30,2000,1005
Naomi,Washington,naomi.washington@email.com,American,1991-10-05,Florianópolis,Brasília,2026-12-01,1100,755
Arthur,Gonzales,arthur.gonzales@email.com,Spanish,1986-12-28,Vitória,Curitiba,2026-12-05,1200,805
Delilah,Diaz,delilah.diaz@email.com,Spanish,1994-08-10,Goiânia,Salvador,2026-12-10,1400,885
Finn,Butler,finn.butler@email.com,American,1989-05-03,Campo Grande,Natal,2026-12-15,2600,1155
Ruby,Alexander,ruby.alexander@email.com,American,1990-03-15,Belém,Recife,2026-12-20,1600,905
Gus,Fisher,gus.fisher@email.com,American,1985-07-22,São Luís,Manaus,2026-12-25,2000,1005
Hazel,Flores,hazel.flores@email.com,Spanish,1992-11-01,Natal,Maceió,2026-12-30,600,485
Kai,Bennett,kai.bennett@email.com,American,1988-04-20,João Pessoa,Fortaleza,2027-01-01,530,455
Alice,Long,alice.long@email.com,American,1995-01-30,Maceió,Belo Horizonte,2027-01-05,1300,855
Jasper,Ward,jasper.ward@email.com,American,1980-09-12,São Paulo,Campo Grande,2027-01-10,870,655
Piper,Brooks,piper.brooks@email.com,American,1993-06-08,Rio de Janeiro,Goiânia,2027-01-15,900,685
Sam,Ramirez,sam.ramirez@email.com,Spanish,1987-02-18,Belo Horizonte,Belém,2027-01-20,2000,1005
River,Roberts,river.roberts@email.com,American,1989-05-03,Maceió,Recife,2027-04-01,200,285`;
  };
  
  const parseCSVContent = (csvContent: string): Array<{
    firstName: string;
    lastName: string;
    email: string;
    nationality: string;
    dateOfBirth: string;
    departureCity: string;
    arrivalCity: string;
    departureDate: string;
    distance: string;
    flightCost: string;
  }> => {
    const lines = csvContent.trim().split('\n');
    const dataLines = lines.slice(1); // Skip header
    
    console.log('--- CSV Processing ---');
    console.log('Total lines in CSV:', lines.length);
    console.log('Data lines (excluding header):', dataLines.length);
    
    return dataLines
      .filter(line => line.trim())
      .map(line => {
        const values = line.split(',');
        return {
          firstName: values[0] || '',
          lastName: values[1] || '',
          email: values[2] || '',
          nationality: values[3] || '',
          dateOfBirth: values[4] || '',
          departureCity: values[5] || '',
          arrivalCity: values[6] || '',
          departureDate: values[7] || '',
          distance: values[8] || '',
          flightCost: values[9] || '',
        };
      });
  };
  
  const insertPassengers = async (db: any, passengers: Array<any>): Promise<number> => {
    let importedCount = 0;
    
    for (const passenger of passengers) {
      const passengerData = {
        firstName: passenger.firstName,
        lastName: passenger.lastName,
        email: passenger.email,
        nationality: passenger.nationality,
        dateOfBirth: passenger.dateOfBirth,
        flightNumber: `BR${String(importedCount + 1).padStart(4, '0')}`,
        departureCity: passenger.departureCity,
        arrivalCity: passenger.arrivalCity,
        departureDate: passenger.departureDate,
        price: passenger.flightCost,
        distance: passenger.distance,
      };
      
      await db.insert(passengersTable).values(passengerData);
      importedCount++;
      
      console.log(`✅ Successfully inserted passenger ${importedCount}: ${passengerData.firstName} ${passengerData.lastName}`);
    }
    
    return importedCount;
  };

export const tools = [
  createGetUserTool,
  createGetPassengersTool,
  createClearDatabaseTool,
  createPopulateTestDataTool,
];
