import { GameEvent } from '../types';
import { logger } from '../utils/logger';

export class AnalyticsService {
  private kafka: any; // Will be initialized if Kafka is available
  private events: GameEvent[] = []; // In-memory storage for demo

  constructor() {
    this.initializeKafka();
  }

  private async initializeKafka(): Promise<void> {
    try {
      // Only initialize Kafka if environment variable is set and not in development mode
      if (process.env.KAFKA_BROKERS && process.env.NODE_ENV !== 'development') {
        const { Kafka } = await import('kafkajs');
        
        this.kafka = new Kafka({
          clientId: 'connect-four-game',
          brokers: process.env.KAFKA_BROKERS.split(',')
        });

        const producer = this.kafka.producer();
        await producer.connect();
        
        logger.info('Kafka producer connected successfully');
      } else {
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

      // Publish to Kafka if available
      if (this.kafka) {
        const producer = this.kafka.producer();
        
        await producer.send({
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

      // Publish to Kafka if available
      if (this.kafka) {
        const producer = this.kafka.producer();
        
        await producer.send({
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
    const gameStarts = this.events.filter(e => e.type === 'game_start');
    const gameEnds = this.events.filter(e => e.type === 'game_end');
    
    let totalDuration = 0;
    let gameCount = 0;

    gameStarts.forEach(start => {
      const end = gameEnds.find(e => e.gameId === start.gameId);
      if (end) {
        totalDuration += end.timestamp.getTime() - start.timestamp.getTime();
        gameCount++;
      }
    });

    return gameCount > 0 ? totalDuration / gameCount / 1000 / 60 : 0; // Return in minutes
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