# Order Management System with CQRS + Event Sourcing

This is a **proper implementation** of CQRS (Command Query Responsibility Segregation) and Event Sourcing using Node.js, Express, MongoDB, and Redis for order management in a shop context.

## 🎯 **What Makes This Implementation Special**

This project now **properly follows** the CQRS + Event Sourcing pattern with:

- ✅ **True Event Sourcing** - All events stored in event store, can replay to rebuild state
- ✅ **Proper CQRS Separation** - Commands and queries completely separated
- ✅ **Domain-Driven Design** - Business logic in aggregates, not controllers
- ✅ **Asynchronous Event Processing** - Events processed via event bus
- ✅ **Event Replay Capability** - Can rebuild read models from events
- ✅ **Optimistic Concurrency Control** - Prevents race conditions
- ✅ **Read Model Projections** - Optimized views for queries

## 🏗 **Architecture**

```
Commands → Aggregates → Events → Event Store → Event Bus → Projections → Read Models → Queries
```

### **Command Side (Write)**
- Commands trigger business logic in aggregates
- Aggregates create domain events
- Events stored in event store (Redis streams)
- Events published to event bus

### **Query Side (Read)**
- Event handlers update read models
- Queries read from optimized read models
- Separate models for different query needs

## 🚀 **API Endpoints**

### **Commands (Write Operations)**
- `POST /api/v1/orders/order` - Create a new order
- `PUT /api/v1/orders/order/:orderId/status` - Update order status
- `PUT /api/v1/orders/order/:orderId/cancel` - Cancel an order
- `DELETE /api/v1/orders/order/:orderId` - Delete an order

### **Queries (Read Operations)**
- `GET /api/v1/orders` - Get all orders (with filters)
- `GET /api/v1/orders/order/:orderId` - Get a specific order
- `GET /api/v1/orders/status/:status` - Get orders by status
- `GET /api/v1/orders/customer/:customerEmail` - Get customer orders
- `GET /api/v1/orders/summary` - Get order summary/analytics
- `GET /api/v1/orders/top-customers` - Get top customers
- `GET /api/v1/orders/search?q=term` - Search orders

## 📊 **Order Status Flow**

Orders follow this status progression with proper validation:
- `pending` → `confirmed` or `cancelled`
- `confirmed` → `processing` or `cancelled`
- `processing` → `shipped` or `cancelled`
- `shipped` → `delivered`
- `delivered` (final state)
- `cancelled` (final state)

## 🛠 **Setup**

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
```

3. **Start the development server:**
```bash
npm run dev
```

The system will automatically:
- Initialize the event bus
- Register event handlers
- Replay existing events to rebuild read models
- Start processing new events

## 🎯 **Key Features**

### **Event Sourcing**
- Complete audit trail of all changes
- Can replay events to rebuild state
- Snapshots for performance optimization
- Event versioning and concurrency control

### **CQRS Benefits**
- Commands and queries optimized separately
- Independent scaling of read/write sides
- Different models for different needs
- Better performance and maintainability

### **Domain-Driven Design**
- Business logic in aggregates
- Rich domain models
- Proper validation and invariants
- Clear separation of concerns

## 📚 **Documentation**

For detailed implementation guide, see: [CQRS_EVENT_SOURCING_GUIDE.md](./CQRS_EVENT_SOURCING_GUIDE.md)

## 🔍 **Event Store Queries**

You can inspect the event store using Redis CLI:

```bash
# View all events for an order
XREAD STREAMS events:order-123 0-0

# View all events in the system
XREAD STREAMS events:* 0-0

# View event bus
XREAD STREAMS event-bus 0-0
```

## 🎉 **Why This Implementation is Better**

### **Before (Issues):**
- ❌ Commands stored as "events"
- ❌ No proper event sourcing
- ❌ Commands directly queried read models
- ❌ No event replay capability
- ❌ Synchronous event processing

### **After (Proper Implementation):**
- ✅ True domain events
- ✅ Complete event sourcing
- ✅ Proper CQRS separation
- ✅ Event replay and snapshots
- ✅ Asynchronous event processing
- ✅ Business logic in aggregates
- ✅ Optimistic concurrency control
