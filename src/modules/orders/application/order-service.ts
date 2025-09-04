import { eventBus } from "../infrastructure/event-bus";
import { orderProjectionHandler } from "../projections/order-projection-handler";
import { eventReplayService } from "./event-replay-service";

export class OrderService {
  async initialize(): Promise<void> {
    console.log("Initializing Order Service...");
    
    try {
      // Register event handlers
      eventBus.registerHandler('OrderCreatedEvent', orderProjectionHandler);
      eventBus.registerHandler('OrderStatusChangedEvent', orderProjectionHandler);
      eventBus.registerHandler('OrderCancelledEvent', orderProjectionHandler);
      eventBus.registerHandler('OrderDeletedEvent', orderProjectionHandler);
      
      // Start event processing
      eventBus.startProcessing();
      
      // Replay existing events to rebuild read models
      await eventReplayService.replayAllEvents();
      
      console.log("Order Service initialized successfully");
    } catch (error) {
      console.error("Error initializing Order Service:", error);
      throw error;
    }
  }

  async createSnapshot(orderId: string): Promise<void> {
    await eventReplayService.createSnapshot(orderId);
  }

  async replayEvents(): Promise<void> {
    await eventReplayService.replayAllEvents();
  }

  async replayEventsFromTimestamp(timestamp: string): Promise<void> {
    await eventReplayService.replayEventsFromTimestamp(timestamp);
  }
}

export const orderService = new OrderService();
