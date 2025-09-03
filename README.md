# Order Management System with CQRS

This is a simple CQRS (Command Query Responsibility Segregation) example using Node.js, Express, MongoDB, and Redis for order management in a shop context.

## Features

- Order management system for a shop
- Event sourcing with Redis streams
- Command and query separation
- Real-time event processing
- Order status tracking and validation

## API Endpoints

### Orders
- `GET /api/v1/orders` - Get all orders
- `GET /api/v1/orders/order/:orderId` - Get a specific order
- `GET /api/v1/orders/status/:status` - Get orders by status
- `POST /api/v1/orders/order` - Create a new order
- `PUT /api/v1/orders/order/:orderId/status` - Update order status
- `DELETE /api/v1/orders/order/:orderId` - Delete an order

## Order Status Flow

Orders follow this status progression:
- `pending` → `confirmed` or `cancelled`
- `confirmed` → `processing` or `cancelled`
- `processing` → `shipped` or `cancelled`
- `shipped` → `delivered`
- `delivered` (final state)
- `cancelled` (final state)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Start the development server:
```bash
npm run dev
```

## Architecture

This project follows CQRS pattern with:
- **Commands**: Handle write operations (create, update, delete orders)
- **Queries**: Handle read operations (get, list orders)
- **Events**: Process domain events asynchronously
- **Event Store**: Redis streams for event sourcing
