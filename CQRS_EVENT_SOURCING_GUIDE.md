# CQRS + Event Sourcing Implementation Guide

## 🎯 **What Was Fixed**

The original implementation had several critical issues that prevented it from properly following the **Event Sourcing + CQRS** pattern. Here's what was corrected:

### ❌ **Original Issues:**
1. **Commands stored as events** - Commands were being stored in Redis streams instead of domain events
2. **No proper event sourcing** - Missing domain events and event store
3. **Improper CQRS separation** - Command side directly queried read models
4. **No event replay capability** - Could not rebuild state from events
5. **Synchronous event processing** - Events processed immediately instead of asynchronously

### ✅ **Proper Implementation:**

## 🏗 **Architecture Overview**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Commands      │    │   Domain        │    │   Events        │
│   (Write)       │───▶│   Aggregate     │───▶│   (What         │
│                 │    │                 │    │   Happened)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Event Store   │    │   Event Bus     │
                       │   (Redis)       │    │   (Async)       │
                       └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │   Projections   │
                                               │   (Read Models) │
                                               └─────────────────┘
```

## 📁 **New File Structure**

```
src/modules/orders/
├── domain/
│   ├── commands.ts           # Command objects
│   ├── events.ts             # Domain events
│   └── order-aggregate.ts    # Aggregate with business logic
├── infrastructure/
│   ├── event-store.ts        # Event storage and retrieval
│   └── event-bus.ts          # Asynchronous event processing
├── application/
│   ├── command-handler.ts    # Handles commands
│   ├── query-handler.ts      # Handles queries
│   ├── order-controller.ts   # REST API controller
│   ├── order-routes.ts       # API routes
│   ├── order-service.ts      # Service initialization
│   └── event-replay-service.ts # Event replay capability
├── projections/
│   └── order-projection-handler.ts # Updates read models
└── read-models/
    ├── order-read-model.ts   # Individual order read model
    └── order-summary-read-model.ts # Summary/analytics model
```

## 🔄 **How It Works**

### 1. **Command Flow**
```typescript
// 1. User sends command
POST /api/v1/orders/order
{
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "items": [...]
}

// 2. Controller creates command object
const command = new CreateOrderCommand(...)

// 3. Command handler processes command
await orderCommandHandler.handleCreateOrder(command)

// 4. Aggregate validates and creates events
aggregate.createOrder(command) // Creates OrderCreatedEvent

// 5. Events saved to event store
await eventStore.saveEvents(orderId, events, expectedVersion)

// 6. Events published to event bus
await eventBus.publishEvents(events)
```

### 2. **Event Processing**
```typescript
// 1. Event bus processes events asynchronously
eventBus.startProcessing()

// 2. Event handlers update read models
orderProjectionHandler.handle(OrderCreatedEvent)

// 3. Read models updated for queries
await OrderReadModel.create({...})
```

### 3. **Query Flow**
```typescript
// 1. User queries data
GET /api/v1/orders

// 2. Query handler reads from read models
const orders = await orderQueryHandler.getOrders(query)

// 3. Optimized read model returns data
return OrderReadModel.find(filter)
```

## 🎯 **Key Components**

### **Domain Events**
```typescript
export class OrderCreatedEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly customerName: string,
    // ... other properties
  ) {
    super(orderId, version);
  }
}
```

### **Commands**
```typescript
export class CreateOrderCommand extends Command {
  constructor(
    public readonly customerName: string,
    public readonly customerEmail: string,
    public readonly items: Array<...>
  ) {
    super();
  }
}
```

### **Aggregate**
```typescript
export class OrderAggregate {
  createOrder(command: CreateOrderCommand): void {
    // Business logic validation
    if (!command.items || command.items.length === 0) {
      throw new Error("Order must contain at least one item");
    }
    
    // Create domain event
    const event = new OrderCreatedEvent(...);
    this.applyEvent(event);
  }
}
```

### **Event Store**
```typescript
export class EventStore {
  async saveEvents(aggregateId: string, events: DomainEvent[], expectedVersion: number): Promise<void> {
    // Optimistic concurrency control
    const currentVersion = await this.getCurrentVersion(aggregateId);
    if (currentVersion !== expectedVersion) {
      throw new Error(`Concurrency conflict`);
    }
    
    // Save events to Redis streams
    await client.sendCommand(["XADD", streamName, "*", ...parameters]);
  }
}
```

## 🚀 **Benefits of This Implementation**

### ✅ **Proper Event Sourcing**
- **Event Store**: All events stored in Redis streams
- **Event Replay**: Can rebuild state from events
- **Audit Trail**: Complete history of all changes
- **Snapshots**: Performance optimization for large aggregates

### ✅ **True CQRS Separation**
- **Command Side**: Handles writes, uses aggregates
- **Query Side**: Optimized read models for queries
- **Independent Scaling**: Commands and queries can scale separately
- **Different Models**: Write and read models optimized for their purpose

### ✅ **Asynchronous Processing**
- **Event Bus**: Events processed asynchronously
- **Eventual Consistency**: Read models updated eventually
- **Better Performance**: Commands return immediately
- **Resilience**: System can handle temporary failures

### ✅ **Business Logic Protection**
- **Aggregates**: Business rules enforced in domain layer
- **Invariants**: Data consistency maintained
- **Validation**: Commands validated before processing
- **State Transitions**: Proper order status flow

## 🔧 **API Endpoints**

### **Commands (Write Operations)**
```
POST   /api/v1/orders/order                    # Create order
PUT    /api/v1/orders/order/:id/status         # Update status
PUT    /api/v1/orders/order/:id/cancel         # Cancel order
DELETE /api/v1/orders/order/:id                # Delete order
```

### **Queries (Read Operations)**
```
GET    /api/v1/orders                          # List orders (with filters)
GET    /api/v1/orders/order/:id                # Get specific order
GET    /api/v1/orders/status/:status           # Get orders by status
GET    /api/v1/orders/customer/:email          # Get customer orders
GET    /api/v1/orders/summary                  # Get order summary
GET    /api/v1/orders/top-customers            # Get top customers
GET    /api/v1/orders/search?q=term            # Search orders
```

## 🎯 **Event Replay Capabilities**

```typescript
// Replay all events to rebuild read models
await eventReplayService.replayAllEvents();

// Replay events from specific timestamp
await eventReplayService.replayEventsFromTimestamp("1234567890");

// Replay events for specific aggregate
await eventReplayService.replayEventsForAggregate("order-123");

// Create snapshot for performance
await eventReplayService.createSnapshot("order-123");
```

## 🔍 **Monitoring and Debugging**

### **Event Store Queries**
```bash
# View all events for an order
XREAD STREAMS events:order-123 0-0

# View all events in the system
XREAD STREAMS events:* 0-0

# View event bus
XREAD STREAMS event-bus 0-0
```

### **Read Model Queries**
```javascript
// Check read model state
db.orderreadmodels.find({ status: "pending" })

// Check summary
db.ordersummaryreadmodels.findOne()
```

## 🎉 **Conclusion**

This implementation now properly follows the **Event Sourcing + CQRS** pattern with:

- ✅ **True separation** of commands and queries
- ✅ **Proper event sourcing** with event store
- ✅ **Domain-driven design** with aggregates
- ✅ **Asynchronous event processing**
- ✅ **Event replay capabilities**
- ✅ **Optimistic concurrency control**
- ✅ **Read model projections**
- ✅ **Business logic protection**

The system is now scalable, maintainable, and follows industry best practices for CQRS and Event Sourcing!
