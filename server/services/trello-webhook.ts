import crypto from 'crypto';
import axios from 'axios';
import { db } from '../db';
import { trelloCards, trelloEditors, trelloWebhooks } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

export interface TrelloWebhookPayload {
  action: {
    type: string;
    data: {
      card?: {
        id: string;
        name: string;
      };
      member?: {
        id: string;
        fullName: string;
        username: string;
      };
      board?: {
        id: string;
        name: string;
      };
    };
  };
  model?: {
    id: string;
    name: string;
  };
}

export class TrelloWebhookService {
  private readonly baseUrl = 'https://api.trello.com/1';
  private readonly key = process.env.TRELLO_KEY;
  private readonly token = process.env.TRELLO_TOKEN;
  private readonly webhookSecret = process.env.TRELLO_WEBHOOK_SECRET;

  constructor() {
    if (!this.key || !this.token) {
      throw new Error('Missing TRELLO_KEY or TRELLO_TOKEN environment variables');
    }
    if (!this.webhookSecret) {
      throw new Error('Missing TRELLO_WEBHOOK_SECRET environment variable');
    }
  }

  /**
   * Verify webhook signature from Trello
   */
  verifyWebhookSignature(body: string, callbackUrl: string, signature: string): boolean {
    try {
      // Trello uses HMAC-SHA1 of body + callbackURL with the webhook secret
      const expectedSignature = crypto
        .createHmac('sha1', this.webhookSecret!)
        .update(body + callbackUrl, 'utf8')
        .digest('base64');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'base64'),
        Buffer.from(expectedSignature, 'base64')
      );
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Create a webhook for a board
   */
  async createWebhook(boardId: string, callbackUrl: string): Promise<string | null> {
    try {
      const response = await axios.post(`${this.baseUrl}/webhooks`, {
        key: this.key,
        token: this.token,
        callbackURL: callbackUrl,
        idModel: boardId,
        description: 'Mementiq Editor Assignment Tracking'
      });

      const webhookId = response.data.id;

      // Store webhook info in database
      await db.insert(trelloWebhooks).values({
        webhookId: webhookId,
        boardId: boardId,
        callbackUrl: callbackUrl
      });

      console.log(`✅ Webhook created: ${webhookId} for board ${boardId}`);
      return webhookId;
    } catch (error) {
      console.error('Error creating webhook:', error);
      return null;
    }
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<boolean> {
    try {
      await axios.delete(`${this.baseUrl}/webhooks/${webhookId}`, {
        params: {
          key: this.key,
          token: this.token
        }
      });

      // Update database
      await db
        .update(trelloWebhooks)
        .set({ isActive: false })
        .where(eq(trelloWebhooks.webhookId, webhookId));

      console.log(`✅ Webhook deleted: ${webhookId}`);
      return true;
    } catch (error) {
      console.error('Error deleting webhook:', error);
      return false;
    }
  }

  /**
   * Get current members of a card
   */
  async getCardMembers(cardId: string): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/cards/${cardId}/members`, {
        params: {
          key: this.key,
          token: this.token
        }
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching members for card ${cardId}:`, error);
      return [];
    }
  }

  /**
   * Process webhook payload for member assignment changes
   */
  async processWebhook(payload: TrelloWebhookPayload): Promise<boolean> {
    try {
      const { action } = payload;
      
      // Only process member assignment events
      if (!['addMemberToCard', 'removeMemberFromCard'].includes(action.type)) {
        console.log(`Ignoring webhook action: ${action.type}`);
        return true; // Not an error, just not relevant
      }

      const cardId = action.data.card?.id;
      if (!cardId) {
        console.log('No card ID in webhook payload');
        return false;
      }

      console.log(`🔔 Processing ${action.type} for card ${cardId}`);

      // Get current members of the card (source of truth)
      const currentMembers = await this.getCardMembers(cardId);
      const memberIds = currentMembers.map(member => member.id);

      console.log(`📋 Current card members: ${memberIds.join(', ')}`);

      // Find the project card in our database
      const projectCards = await db
        .select()
        .from(trelloCards)
        .where(eq(trelloCards.cardId, cardId));

      if (projectCards.length === 0) {
        console.log(`No project found for Trello card ${cardId}`);
        return true; // Not an error, might be a card we don't track
      }

      // Update all matching cards with current member assignments
      for (const projectCard of projectCards) {
        // For simplicity, we'll store the first assigned editor
        // You could extend this to handle multiple editors if needed
        const assignedEditorId = memberIds.length > 0 ? memberIds[0] : null;

        await db
          .update(trelloCards)
          .set({ 
            assignedEditorId: assignedEditorId
          })
          .where(eq(trelloCards.id, projectCard.id));

        console.log(`✅ Updated project ${projectCard.projectId} (${projectCard.cardType}) with editor: ${assignedEditorId || 'none'}`);

        // Log the editor info if we have them mapped
        if (assignedEditorId) {
          const editor = await db
            .select()
            .from(trelloEditors)
            .where(eq(trelloEditors.trelloMemberId, assignedEditorId))
            .limit(1);

          if (editor.length > 0) {
            console.log(`👤 Editor: ${editor[0].editorName}`);
          } else {
            console.log(`⚠️  Unknown editor with Trello ID: ${assignedEditorId}`);
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error processing webhook:', error);
      return false;
    }
  }

  /**
   * Add or update editor mapping
   */
  async addEditor(trelloMemberId: string, editorName: string): Promise<boolean> {
    try {
      // Try to update existing editor first
      const existingEditor = await db
        .select()
        .from(trelloEditors)
        .where(eq(trelloEditors.trelloMemberId, trelloMemberId))
        .limit(1);

      if (existingEditor.length > 0) {
        await db
          .update(trelloEditors)
          .set({ 
            editorName,
            updatedAt: new Date()
          })
          .where(eq(trelloEditors.trelloMemberId, trelloMemberId));

        console.log(`✅ Updated editor mapping: ${editorName} (${trelloMemberId})`);
      } else {
        await db.insert(trelloEditors).values({
          trelloMemberId,
          editorName
        });

        console.log(`✅ Added new editor mapping: ${editorName} (${trelloMemberId})`);
      }

      return true;
    } catch (error) {
      console.error('Error adding/updating editor:', error);
      return false;
    }
  }

  /**
   * Get all editors
   */
  async getAllEditors() {
    return await db
      .select()
      .from(trelloEditors);
  }

  /**
   * Get all webhooks
   */
  async getActiveWebhooks() {
    return await db
      .select()
      .from(trelloWebhooks);
  }
}

export const trelloWebhookService = new TrelloWebhookService();