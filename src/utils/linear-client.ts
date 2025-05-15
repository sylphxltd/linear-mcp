import { LinearClient } from '@linear/sdk';

// Singleton pattern for Linear client
export class LinearClientManager {
  private static instance: LinearClientManager;
  private client: LinearClient | null = null;

  private constructor() {}

  public static getInstance(): LinearClientManager {
    if (!LinearClientManager.instance) {
      LinearClientManager.instance = new LinearClientManager();
    }
    return LinearClientManager.instance;
  }

  public initialize(apiKey: string): void {
    if (!this.client) {
      this.client = new LinearClient({ apiKey });
    }
  }

  public getClient(): LinearClient {
    if (!this.client) {
      throw new Error('Linear client not initialized. Call initialize() first.');
    }
    return this.client;
  }
}

export const getLinearClient = (): LinearClient => {
  return LinearClientManager.getInstance().getClient();
};