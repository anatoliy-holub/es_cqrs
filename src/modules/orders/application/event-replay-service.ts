import { eventStore } from "../infrastructure/event-store";
import { orderProjectionHandler } from "../projections/order-projection-handler";
import { DomainEvent } from "../domain/events";

export class EventReplayService {
  async replayAllEvents(): Promise<void> {
    console.log("Starting event replay...");
    
    try {
      // Clear existing read models
      await this.clearReadModels();
      
      // Get all events from event store
      const allEvents = await eventStore.getAllEvents();
      
      console.log(`Found ${allEvents.length} events to replay`);
      
      // Replay events in chronological order
      for (const storedEvent of allEvents) {
        try {
          await orderProjectionHandler.handle(storedEvent.eventData);
        } catch (error) {
          console.error(`Error replaying event ${storedEvent.eventId}:`, error);
          // Continue with other events even if one fails
        }
      }
      
      console.log("Event replay completed successfully");
    } catch (error) {
      console.error("Error during event replay:", error);
      throw error;
    }
  }

  async replayEventsFromTimestamp(fromTimestamp: string): Promise<void> {
    console.log(`Starting event replay from timestamp: ${fromTimestamp}`);
    
    try {
      // Get events from specific timestamp
      const events = await eventStore.getAllEvents(fromTimestamp);
      
      console.log(`Found ${events.length} events to replay from timestamp`);
      
      // Replay events
      for (const storedEvent of events) {
        try {
          await orderProjectionHandler.handle(storedEvent.eventData);
        } catch (error) {
          console.error(`Error replaying event ${storedEvent.eventId}:`, error);
        }
      }
      
      console.log("Event replay from timestamp completed successfully");
    } catch (error) {
      console.error("Error during event replay from timestamp:", error);
      throw error;
    }
  }

  async replayEventsForAggregate(aggregateId: string): Promise<void> {
    console.log(`Starting event replay for aggregate: ${aggregateId}`);
    
    try {
      // Get events for specific aggregate
      const events = await eventStore.getEvents(aggregateId);
      
      console.log(`Found ${events.length} events for aggregate ${aggregateId}`);
      
      // Replay events
      for (const storedEvent of events) {
        try {
          await orderProjectionHandler.handle(storedEvent.eventData);
        } catch (error) {
          console.error(`Error replaying event ${storedEvent.eventId}:`, error);
        }
      }
      
      console.log(`Event replay for aggregate ${aggregateId} completed successfully`);
    } catch (error) {
      console.error(`Error during event replay for aggregate ${aggregateId}:`, error);
      throw error;
    }
  }

  async createSnapshot(aggregateId: string): Promise<void> {
    try {
      // Load aggregate from events
      const events = await eventStore.getEvents(aggregateId);
      
      if (events.length === 0) {
        console.log(`No events found for aggregate ${aggregateId}`);
        return;
      }

      // Rebuild aggregate state
      const aggregate = this.rebuildAggregateFromEvents(events);
      
      // Create snapshot
      const snapshot = {
        aggregateId,
        state: {
          id: aggregate.id,
          version: aggregate.version,
          status: aggregate.status,
          customerName: aggregate.customerName,
          customerEmail: aggregate.customerEmail,
          items: aggregate.items,
          totalAmount: aggregate.totalAmount,
          orderDate: aggregate.orderDate,
          isDeleted: aggregate.isDeleted
        },
        lastEventVersion: events[events.length - 1].version
      };

      // Save snapshot
      await eventStore.saveSnapshot(aggregateId, snapshot, snapshot.lastEventVersion);
      
      console.log(`Snapshot created for aggregate ${aggregateId} at version ${snapshot.lastEventVersion}`);
    } catch (error) {
      console.error(`Error creating snapshot for aggregate ${aggregateId}:`, error);
      throw error;
    }
  }

  async rebuildAggregateFromSnapshot(aggregateId: string): Promise<any> {
    try {
      // Get latest snapshot
      const snapshot = await eventStore.getLatestSnapshot(aggregateId);
      
      if (!snapshot) {
        console.log(`No snapshot found for aggregate ${aggregateId}`);
        return null;
      }

      // Get events after snapshot
      const events = await eventStore.getEvents(aggregateId, snapshot.version);
      
      // Rebuild aggregate from snapshot + events
      const aggregate = this.rebuildAggregateFromEvents(events, snapshot.snapshot);
      
      return aggregate;
    } catch (error) {
      console.error(`Error rebuilding aggregate from snapshot ${aggregateId}:`, error);
      throw error;
    }
  }

  private async clearReadModels(): Promise<void> {
    try {
      const { default: OrderReadModel } = await import("../read-models/order-read-model");
      const { default: OrderSummaryReadModel } = await import("../read-models/order-summary-read-model");
      
      await OrderReadModel.deleteMany({});
      await OrderSummaryReadModel.deleteMany({});
      
      console.log("Read models cleared");
    } catch (error) {
      console.error("Error clearing read models:", error);
      throw error;
    }
  }

  private rebuildAggregateFromEvents(events: any[], initialState?: any): any {
    // This is a simplified version - in a real implementation,
    // you'd want to properly rebuild the aggregate using the domain logic
    let state = initialState || {
      id: '',
      version: 0,
      status: 'pending',
      customerName: '',
      customerEmail: '',
      items: [],
      totalAmount: 0,
      orderDate: new Date(),
      isDeleted: false
    };

    events.forEach(event => {
      switch (event.eventType) {
        case 'OrderCreatedEvent':
          state.id = event.eventData.orderId;
          state.customerName = event.eventData.customerName;
          state.customerEmail = event.eventData.customerEmail;
          state.items = event.eventData.items;
          state.totalAmount = event.eventData.totalAmount;
          state.orderDate = event.eventData.orderDate;
          state.status = 'pending';
          break;
        case 'OrderStatusChangedEvent':
          state.status = event.eventData.newStatus;
          break;
        case 'OrderCancelledEvent':
          state.status = 'cancelled';
          break;
        case 'OrderDeletedEvent':
          state.isDeleted = true;
          break;
      }
      state.version = event.version;
    });

    return state;
  }
}

export const eventReplayService = new EventReplayService();
