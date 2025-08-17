# Airlines MCP Server

Este é um servidor MCP (Model Context Protocol) para gerenciamento de dados de companhias aéreas, construído com Deco.chat, Cloudflare Workers e React.

## 🚀 Funcionalidades

### Tools Disponíveis

#### 1. **POPULATE_TEST_DATA**
- **Descrição**: Popula o banco de dados com dados de teste de passageiros
- **Parâmetros**: Nenhum
- **Uso**: Execute esta tool primeiro para inserir dados de teste no banco

#### 2. **GET_PASSENGERS**
- **Descrição**: Retorna dados de passageiros do banco de dados com filtros opcionais
- **Parâmetros**:
  - `flightNumber` (opcional): Filtrar por número do voo
  - `departureCity` (opcional): Filtrar por cidade de partida
  - `arrivalCity` (opcional): Filtrar por cidade de chegada
  - `ticketClass` (opcional): Filtrar por classe da passagem
  - `status` (opcional): Filtrar por status
  - `limit` (opcional): Limitar número de resultados

#### 3. **GET_PASSENGER_STATS**
- **Descrição**: Retorna estatísticas sobre os passageiros no banco
- **Parâmetros**: Nenhum
- **Retorna**: Contagem total, distribuição por classe, status, voo e preço médio

#### 4. **IMPORT_PASSENGERS_FROM_CSV**
- **Descrição**: Importa dados de passageiros de um arquivo CSV
- **Parâmetros**:
  - `csvContent`: Conteúdo do arquivo CSV como string

## 📊 Estrutura dos Dados

### Tabela de Passageiros
- **Campos obrigatórios**: firstName, lastName, email, flightNumber, departureCity, arrivalCity, departureDate
- **Campos opcionais**: phone, passportNumber, nationality, dateOfBirth, seatNumber, ticketClass, price, status
- **Valores padrão**: status = "confirmed", createdAt = timestamp atual

### Exemplo de CSV
```csv
firstName,lastName,email,phone,passportNumber,nationality,dateOfBirth,seatNumber,flightNumber,departureCity,arrivalCity,departureDate,ticketClass,price,status
João,Silva,joao.silva@email.com,+55 11 99999-1111,BR123456,brasileiro,1985-03-15,12A,LA1234,São Paulo,Los Angeles,2024-01-15,economy,2500.00,confirmed
```

## 🛠️ Como Usar

### 1. Popular com Dados de Teste
```typescript
// Primeiro, execute esta tool para inserir dados de teste
const result = await client.POPULATE_TEST_DATA({});
console.log(result.message); // "Successfully populated database with 10 test passengers"
```

### 2. Buscar Todos os Passageiros
```typescript
const result = await client.GET_PASSENGERS({});
console.log(`Total de passageiros: ${result.totalCount}`);
console.log(result.passengers);
```

### 3. Filtrar Passageiros
```typescript
// Buscar apenas passageiros da classe economy
const economyPassengers = await client.GET_PASSENGERS({ 
  ticketClass: "economy" 
});

// Buscar passageiros de um voo específico
const flightPassengers = await client.GET_PASSENGERS({ 
  flightNumber: "LA1234" 
});

// Limitar resultados
const limitedPassengers = await client.GET_PASSENGERS({ 
  limit: 5 
});
```

### 4. Obter Estatísticas
```typescript
const stats = await client.GET_PASSENGER_STATS({});
console.log(`Total de passageiros: ${stats.totalPassengers}`);
console.log(`Distribuição por classe:`, stats.byTicketClass);
console.log(`Preço médio: R$ ${stats.averagePrice}`);
```

### 5. Importar CSV Personalizado
```typescript
const csvContent = `firstName,lastName,email,flightNumber,departureCity,arrivalCity,departureDate
João,Silva,joao@email.com,BR123,São Paulo,Rio de Janeiro,2024-02-01`;

const result = await client.IMPORT_PASSENGERS_FROM_CSV({
  csvContent: csvContent
});
```

## 🔧 Desenvolvimento

### Comandos Disponíveis
- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run gen` - Gera tipos para integrações externas
- `npm run gen:self` - Gera tipos para suas próprias tools (requer servidor rodando)
- `npm run deploy` - Deploy para produção

### Estrutura do Projeto
- `/server` - Servidor MCP (Cloudflare Workers + Deco)
- `/view` - Frontend React com Tailwind CSS
- `/server/schema.ts` - Schema do banco de dados
- `/server/tools.ts` - Definição das tools
- `/server/sample-passengers.csv` - Arquivo CSV de exemplo

## 📝 Notas Importantes

1. **Sempre execute `POPULATE_TEST_DATA` primeiro** para ter dados para testar
2. **As migrações são aplicadas automaticamente** quando você usa `getDb(env)`
3. **Use filtros em memória** para simplicidade (adequado para datasets pequenos)
4. **O banco usa SQLite** com Drizzle ORM para persistência

## 🚨 Solução de Problemas

### Erro "No passengers found in database"
- Execute `POPULATE_TEST_DATA` primeiro
- Verifique se a migração foi aplicada corretamente

### Erro de Schema
- Execute `npm run db:generate` após modificar `schema.ts`
- Reinicie o servidor após mudanças no schema

### Problemas de Tipo
- Execute `npm run gen:self` após adicionar novas tools
- Verifique se todas as tools estão incluídas no array `tools`
