import client from "../../../config/redis";
import { DomainEvent } from "../domain/events";
import { convertObjectToParameters, convertArrayParametersToObject } from "../../app/helper";

export interface StoredEvent {
  eventId: string;
  aggregateId: string;
  eventType: string;
  eventData: any;
  version: number;
  occurredOn: Date;
  streamName: string;
}

export class EventStore {
  private readonly STREAM_PREFIX = "events:";
  private readonly SNAPSHOT_PREFIX = "snapshots:";

  async saveEvents(aggregateId: string, events: DomainEvent[], expectedVersion: number): Promise<void> {
    const streamName = `${this.STREAM_PREFIX}${aggregateId}`;
    
    // Check current version for optimistic concurrency control
    const currentVersion = await this.getCurrentVersion(aggregateId);
    if (currentVersion !== expectedVersion) {
      throw new Error(`Concurrency conflict. Expected version ${expectedVersion}, but current version is ${currentVersion}`);
    }

    // Save each event
    for (const event of events) {
      const storedEvent: StoredEvent = {
        eventId: event.eventId,
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        eventData: event,
        version: event.version,
        occurredOn: event.occurredOn,
        streamName: streamName
      };

      const parameters = convertObjectToParameters(storedEvent);
      await client.sendCommand(["XADD", streamName, "*", ...parameters]);
    }

    // Update version
    await client.set(`${streamName}:version`, events[events.length - 1].version.toString());
  }

  async getEvents(aggregateId: string, fromVersion: number = 0): Promise<StoredEvent[]> {
    const streamName = `${this.STREAM_PREFIX}${aggregateId}`;
    
    try {
      const events: any = await client.sendCommand([
        "XREAD",
        "STREAMS",
        streamName,
        "0-0"
      ]);

      if (!events || events.length === 0) {
        return [];
      }

      const [_, records] = events[0];
      const storedEvents: StoredEvent[] = [];

      for (const record of records) {
        const [__, eventData] = record;
        const storedEvent = convertArrayParametersToObject(eventData) as StoredEvent;
        
        // Convert occurredOn back to Date
        storedEvent.occurredOn = new Date(storedEvent.occurredOn);
        
        // Filter by version if specified
        if (storedEvent.version > fromVersion) {
          storedEvents.push(storedEvent);
        }
      }

      return storedEvents.sort((a, b) => a.version - b.version);
    } catch (error) {
      console.error(`Error reading events for aggregate ${aggregateId}:`, error);
      return [];
    }
  }

  async getCurrentVersion(aggregateId: string): Promise<number> {
    const streamName = `${this.STREAM_PREFIX}${aggregateId}`;
    const version = await client.get(`${streamName}:version`);
    return version ? parseInt(version) : 0;
  }

  async getAllEvents(fromTimestamp?: string): Promise<StoredEvent[]> {
    try {
      // Get all event streams
      const streamKeys = await client.keys(`${this.STREAM_PREFIX}*`);
      const eventStreams = streamKeys.filter(key => !key.endsWith(':version'));
      
      if (eventStreams.length === 0) {
        return [];
      }

      const events: any = await client.sendCommand([
        "XREAD",
        "STREAMS",
        ...eventStreams,
        ...eventStreams.map(() => fromTimestamp || "0-0")
      ]);

      if (!events) {
        return [];
      }

      const allEvents: StoredEvent[] = [];

      for (const streamResult of events) {
        const [streamName, records] = streamResult;
        
        for (const record of records) {
          const [__, eventData] = record;
          const storedEvent = convertArrayParametersToObject(eventData) as StoredEvent;
          storedEvent.occurredOn = new Date(storedEvent.occurredOn);
          allEvents.push(storedEvent);
        }
      }

      return allEvents.sort((a, b) => a.occurredOn.getTime() - b.occurredOn.getTime());
    } catch (error) {
      console.error("Error reading all events:", error);
      return [];
    }
  }

  async saveSnapshot(aggregateId: string, snapshot: any, version: number): Promise<void> {
    const snapshotKey = `${this.SNAPSHOT_PREFIX}${aggregateId}`;
    const snapshotData = {
      aggregateId,
      version,
      data: snapshot,
      createdAt: new Date()
    };

    const parameters = convertObjectToParameters(snapshotData);
    await client.sendCommand(["XADD", snapshotKey, "*", ...parameters]);
  }

  async getLatestSnapshot(aggregateId: string): Promise<{ snapshot: any; version: number } | null> {
    const snapshotKey = `${this.SNAPSHOT_PREFIX}${aggregateId}`;
    
    try {
      const events: any = await client.sendCommand([
        "XREAD",
        "STREAMS",
        snapshotKey,
        "0-0"
      ]);

      if (!events || events.length === 0) {
        return null;
      }

      const [_, records] = events[0];
      if (records.length === 0) {
        return null;
      }

      // Get the latest snapshot
      const [__, snapshotData] = records[records.length - 1];
      const snapshot = convertArrayParametersToObject(snapshotData);
      
      return {
        snapshot: snapshot.data,
        version: snapshot.version
      };
    } catch (error) {
      console.error(`Error reading snapshot for aggregate ${aggregateId}:`, error);
      return null;
    }
  }
}

export const eventStore = new EventStore();
