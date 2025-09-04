import client from "../../../config/redis";
import { DomainEvent } from "../domain/events";
import { convertObjectToParameters } from "../../app/helper";

export interface EventHandler {
  handle(event: DomainEvent): Promise<void>;
}

export class EventBus {
  private readonly EVENT_BUS_STREAM = "event-bus";
  private handlers: Map<string, EventHandler[]> = new Map();

  // Register event handlers
  registerHandler(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  // Publish events to the event bus
  async publishEvents(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      const eventData = {
        eventId: event.eventId,
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        eventData: event,
        occurredOn: event.occurredOn,
        version: event.version
      };

      const parameters = convertObjectToParameters(eventData);
      await client.sendCommand(["XADD", this.EVENT_BUS_STREAM, "*", ...parameters]);
    }
  }

  // Process events from the event bus
  async processEvents(): Promise<void> {
    try {
      const events: any = await client.sendCommand([
        "XREAD",
        "STREAMS",
        this.EVENT_BUS_STREAM,
        "0-0"
      ]);

      if (!events || events.length === 0) {
        return;
      }

      const [_, records] = events[0];
      
      for (const record of records) {
        const [__, eventData] = record;
        await this.handleEvent(eventData);
      }
    } catch (error) {
      console.error("Error processing events:", error);
    }
  }

  private async handleEvent(eventData: any): Promise<void> {
    try {
      const eventType = eventData.eventType;
      const handlers = this.handlers.get(eventType) || [];
      
      // Convert event data back to proper format
      const event = this.convertToEvent(eventData);
      
      // Execute all handlers for this event type
      for (const handler of handlers) {
        try {
          await handler.handle(event);
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
          // Continue with other handlers even if one fails
        }
      }
    } catch (error) {
      console.error("Error handling event:", error);
    }
  }

  private convertToEvent(eventData: any): DomainEvent {
    // This is a simplified conversion - in a real implementation,
    // you'd want to properly deserialize the event based on its type
    return eventData.eventData;
  }

  // Start event processing loop
  startProcessing(): void {
    setInterval(async () => {
      await this.processEvents();
    }, 1000); // Process events every second
  }
}

export const eventBus = new EventBus();
