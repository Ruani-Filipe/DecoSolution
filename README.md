# Airlines Management System

A comprehensive airline passenger management system built with Deco MCP server and React frontend.

## Features

- **Passenger Management**: Import, view, and manage passenger data
- **CSV Import**: Bulk import passenger data from CSV files
- **Database Operations**: Clear database and populate with test data
- **Filtering**: Search passengers by various criteria
- **Modern UI**: Built with React, Tailwind CSS, and shadcn/ui

## Database Schema

The system uses a comprehensive passenger database with the following structure:

### Passengers Table
- `id` - Primary key
- `firstName` - Passenger's first name
- `lastName` - Passenger's last name
- `email` - Contact email
- `nationality` - Passenger nationality
- `dateOfBirth` - Date of birth
- `flightNumber` - Flight identifier
- `departureCity` - Departure city
- `arrivalCity` - Arrival city
- `departureDate` - Flight departure date
- `ticketClass` - Ticket class (economy, business, first)
- `price` - Ticket price
- `status` - Booking status
- `distance` - Flight distance in kilometers
- `createdAt` - Record creation timestamp

## Available Tools

### 1. GET_PASSENGERS
Retrieve passenger data with optional filtering:
- Filter by flight number, departure/arrival city, ticket class, or status
- Apply result limits
- Returns clean, normalized data matching CSV structure

### 2. POPULATE_TEST_DATA
Populate database with sample passenger data:
- Automatically generates flight numbers
- Sets default values for optional fields
- Prevents duplicate population

### 3. CLEAR_DATABASE
Remove all passenger data from the database:
- Safe operation with confirmation
- Returns count of deleted records

## CSV Format

The system expects CSV files with the following columns:
```csv
firstName,lastName,email,nationality,dateOfBirth,departureCity,arrivalCity,departureDate,distance,flightCost
```

### Sample Data
- **Brazilian Routes**: São Paulo → Rio de Janeiro, Brasília → Salvador, etc.
- **Realistic Data**: Actual distances and estimated flight costs

## Development

### Prerequisites
- Node.js >=18.0.0
- npm >=8.0.0
- Deno >=2.0.0

### Setup
```bash
# Install dependencies
npm install

# Configure the app
npm run configure

# Start development server
npm run dev

# Generate types
npm run gen

# Deploy to production
npm run deploy
```

### Architecture
- **Backend**: Deco MCP server with Cloudflare Workers
- **Database**: SQLite with Drizzle ORM
- **Frontend**: React with TanStack Router and Query
- **Styling**: Tailwind CSS with shadcn/ui components

## API Endpoints

- `GET /mcp` - MCP server endpoints
- `GET /` - React frontend application

## Database Migrations

Migrations are automatically applied when using `getDb(env)`. No manual migration commands needed.

## Error Handling

- Comprehensive error handling with meaningful messages
- Timeout protection for long-running operations
- Batch processing for large data imports
- Transaction support for data integrity

## Performance

- Batch processing with configurable batch sizes
- Database transactions for bulk operations
- Optimized queries with proper indexing
- 5-minute timeout configuration for long operations

## Contributing

1. Follow the established code patterns
2. Use helper functions for complex operations
3. Maintain consistent error handling
4. Update documentation for new features
5. Test thoroughly before deployment

## License

This project is part of the Deco MCP template system.