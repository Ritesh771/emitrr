import { Kafka, Producer } from 'kafkajs';
import { GameEvent } from '../types';
import { logger } from '../utils/logger';

export class AnalyticsService {
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private events: GameEvent[] = []; // In-memory storage for demo
  private readonly MAX_EVENTS_IN_MEMORY = 5000; // Cap to prevent memory leaks

  constructor() {
    this.initializeKafka();
  }

  private async initializeKafka(): Promise<void> {
    try {
      // Only initialize Kafka if environment variable is set and not in development mode
      if (process.env.KAFKA_BROKERS) { // Allow Kafka in dev if brokers are configured
        this.kafka = new Kafka({
          clientId: 'connect-four-game',
          brokers: process.env.KAFKA_BROKERS.split(',')
        });

        this.producer = this.kafka.producer();
        await this.producer.connect();
        
        logger.info('Kafka producer connected successfully');
      } else if (process.env.NODE_ENV === 'development') { // Only log this warning in development
        logger.info('Kafka disabled for development mode, using in-memory analytics storage');
      }
    } catch (error) {
      logger.warn('Kafka not available, using in-memory analytics storage');
    }
  }
  
  async publishGameEvent(event: GameEvent): Promise<void> {
    try {
      // Store in memory for analytics
      this.events.push(event);
      // Cap the array size to prevent unbounded memory growth
      if (this.events.length > this.MAX_EVENTS_IN_MEMORY) {
        this.events.shift(); // Remove the oldest event
      }

      // Publish to Kafka if available
      if (this.producer) {
        await this.producer.send({
          topic: 'game-events',
          messages: [
            {
              key: event.gameId,
              value: JSON.stringify(event),
              timestamp: event.timestamp.getTime().toString()
            }
          ]
        });
      }

      logger.debug('Game event published:', event.type);
    } catch (error) {
      logger.error('Error publishing game event:', error);
    }
  }

  async publishPlayerEvent(playerId: string, eventType: string, data: any): Promise<void> {
    try {
      const event = {
        type: eventType,
        playerId,
        data,
        timestamp: new Date()
      };

      // Store in memory
      this.events.push(event as GameEvent);
      if (this.events.length > this.MAX_EVENTS_IN_MEMORY) {
        this.events.shift();
      }

      // Publish to Kafka if available
      if (this.producer) {
        await this.producer.send({
          topic: 'player-events',
          messages: [
            {
              key: playerId,
              value: JSON.stringify(event),
              timestamp: event.timestamp.getTime().toString()
            }
          ]
        });
      }

      logger.debug('Player event published:', eventType);
    } catch (error) {
      logger.error('Error publishing player event:', error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
      logger.info('Kafka producer disconnected.');
    }
  }

  // Analytics methods for in-memory data
  getGameAnalytics(): any {
    const gameEvents = this.events.filter(e => e.type.includes('game'));
    
    return {
      totalGames: gameEvents.filter(e => e.type === 'game_start').length,
      completedGames: gameEvents.filter(e => e.type === 'game_end').length,
      averageGameDuration: this.calculateAverageGameDuration(),
      eventsToday: this.getEventsToday().length,
      mostActiveHour: this.getMostActiveHour()
    };
  }

  private calculateAverageGameDuration(): number {
    const gameDurations = new Map<string, { start?: number, end?: number }>();

    this.events.forEach(event => {
      if (!event.gameId || (event.type !== 'game_start' && event.type !== 'game_end')) {
        return;
      }
      const times = gameDurations.get(event.gameId) || {};
      if (event.type === 'game_start') {
        times.start = event.timestamp.getTime();
      } else if (event.type === 'game_end') {
        times.end = event.timestamp.getTime();
      }
      gameDurations.set(event.gameId, times);
    });

    let totalDuration = 0;
    let gameCount = 0;

    gameDurations.forEach(times => {
      if (times.start && times.end) {
        totalDuration += times.end - times.start;
        gameCount++;
      }
    });

    if (gameCount === 0) return 0;
    
    const averageMilliseconds = totalDuration / gameCount;
    return averageMilliseconds / (1000 * 60); // Return in minutes
  }

  private getEventsToday(): GameEvent[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.events.filter(e => e.timestamp >= today);
  }

  private getMostActiveHour(): number {
    const hourCounts: { [hour: number]: number } = {};
    
    this.events.forEach(event => {
      const hour = event.timestamp.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    let maxCount = 0;
    let mostActiveHour = 0;

    Object.entries(hourCounts).forEach(([hour, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostActiveHour = parseInt(hour);
      }
    });

    return mostActiveHour;
  }
}