import axios from 'axios';

interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  idList: string;
  idMembers: string[];
  due: string | null;
  labels: any[];
}

interface TrelloList {
  id: string;
  name: string;
  idBoard: string;
}

interface TrelloMember {
  id: string;
  fullName: string;
  username: string;
}

interface TrelloLabel {
  id: string;
  name: string;
  color: string;
}

export class TrelloService {
  private apiKey: string;
  private token: string;
  private baseUrl = 'https://api.trello.com/1';

  constructor() {
    this.apiKey = process.env.TRELLO_KEY || '';
    this.token = process.env.TRELLO_TOKEN || '';
    
    console.log('Trello Service initialization:');
    console.log('TRELLO_KEY configured:', !!this.apiKey);
    console.log('TRELLO_TOKEN configured:', !!this.token);
    
    if (!this.apiKey || !this.token) {
      console.error('Missing Trello credentials - API Key:', !!this.apiKey, 'Token:', !!this.token);
      throw new Error('Trello API credentials not configured');
    }
    
    console.log('✅ Trello API credentials configured successfully');
  }

  private getAuthParams() {
    return {
      key: this.apiKey,
      token: this.token
    };
  }

  // Get all boards for the user
  async getBoards(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/members/me/boards`, {
        params: this.getAuthParams()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Trello boards:', error);
      throw error;
    }
  }

  // Get lists for a board
  async getBoardLists(boardId: string): Promise<TrelloList[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/boards/${boardId}/lists`, {
        params: this.getAuthParams()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching board lists:', error);
      throw error;
    }
  }

  // Get board members
  async getBoardMembers(boardId: string): Promise<TrelloMember[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/boards/${boardId}/members`, {
        params: this.getAuthParams()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching board members:', error);
      throw error;
    }
  }

  // Get board labels
  async getBoardLabels(boardId: string): Promise<TrelloLabel[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/boards/${boardId}/labels`, {
        params: this.getAuthParams()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching board labels:', error);
      throw error;
    }
  }

  // Create a label on the board
  async createLabel(boardId: string, name: string, color: string): Promise<TrelloLabel> {
    try {
      const response = await axios.post(`${this.baseUrl}/labels`, {
        name,
        color,
        idBoard: boardId,
        ...this.getAuthParams()
      });
      return response.data;
    } catch (error) {
      console.error('Error creating Trello label:', error);
      throw error;
    }
  }

  // Move a card to a different list
  async moveCard(cardId: string, listId: string): Promise<any> {
    try {
      const response = await axios.put(`${this.baseUrl}/cards/${cardId}/idList`, {
        value: listId,
        ...this.getAuthParams()
      });
      return response.data;
    } catch (error) {
      console.error('Error moving Trello card:', error);
      throw error;
    }
  }

  // Assign member to card
  async assignMemberToCard(cardId: string, memberId: string): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/cards/${cardId}/idMembers`, {
        value: memberId,
        ...this.getAuthParams()
      });
      return response.data;
    } catch (error) {
      console.error('Error assigning member to Trello card:', error);
      throw error;
    }
  }

  // Add attachment (URL) to card
  async addAttachmentToCard(cardId: string, url: string, name?: string): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/cards/${cardId}/attachments`, {
        url,
        name: name || url,
        ...this.getAuthParams()
      });
      return response.data;
    } catch (error) {
      console.error('Error adding attachment to Trello card:', error);
      throw error;
    }
  }

  // Get card's short URL for linking
  async getCardShortUrl(cardId: string): Promise<string | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/cards/${cardId}`, {
        params: {
          fields: 'shortUrl',
          ...this.getAuthParams()
        }
      });
      return response.data.shortUrl;
    } catch (error) {
      console.error('Error fetching card short URL:', error);
      return null;
    }
  }

  // Get card attachments to check for duplicates
  async getCardAttachments(cardId: string): Promise<Array<{url: string, name: string}>> {
    try {
      const response = await axios.get(`${this.baseUrl}/cards/${cardId}/attachments`, {
        params: this.getAuthParams()
      });
      return response.data.map((attachment: any) => ({
        url: attachment.url,
        name: attachment.name
      }));
    } catch (error) {
      console.error('Error fetching card attachments:', error);
      return [];
    }
  }

  // Add URL attachment to card with duplicate checking
  async addCardAttachment(cardId: string, url: string, name: string): Promise<boolean> {
    try {
      // Check existing attachments to avoid duplicates
      const existingAttachments = await this.getCardAttachments(cardId);
      const duplicateExists = existingAttachments.some(attachment => attachment.url === url);
      
      if (duplicateExists) {
        console.log(`Attachment already exists: ${name} -> ${url}`);
        return true;
      }

      await this.addAttachmentToCard(cardId, url, name);
      console.log(`✅ Added attachment: ${name} -> ${url}`);
      return true;
    } catch (error) {
      console.error('Error adding card attachment:', error);
      return false;
    }
  }

  // Create bidirectional links between original and revision cards
  async linkCards(originalCardId: string, revisionCardId: string, projectTitle: string, revisionNumber: number): Promise<void> {
    try {
      console.log(`🔗 Creating bidirectional links between cards...`);
      
      // Get short URLs for both cards
      const originalShortUrl = await this.getCardShortUrl(originalCardId);
      const revisionShortUrl = await this.getCardShortUrl(revisionCardId);
      
      if (!originalShortUrl || !revisionShortUrl) {
        console.error('Failed to get card URLs for linking');
        return;
      }

      // Link revision card to original card
      await this.addCardAttachment(
        revisionCardId, 
        originalShortUrl, 
        `📄 Original Request: ${projectTitle}`
      );

      // Link original card to revision card
      await this.addCardAttachment(
        originalCardId, 
        revisionShortUrl, 
        `🔄 Revision #${revisionNumber}: ${projectTitle}`
      );

      console.log(`✅ Bidirectional links created between original and revision cards`);
    } catch (error) {
      console.error('Error creating card links:', error);
    }
  }

  // Add comment to card
  async addCommentToCard(cardId: string, text: string): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/cards/${cardId}/actions/comments`, {
        text,
        ...this.getAuthParams()
      });
      return response.data;
    } catch (error) {
      console.error('Error adding comment to Trello card:', error);
      throw error;
    }
  }

  // Create a new card
  async createCard(data: {
    name: string;
    desc: string;
    idList: string;
    idMembers?: string[];
    start?: string; // Start date in ISO format
    due?: string; // Due date in ISO format
    idLabels?: string[]; // Label IDs to apply to the card
  }): Promise<TrelloCard> {
    try {
      const response = await axios.post(`${this.baseUrl}/cards`, {
        ...data,
        ...this.getAuthParams()
      });
      console.log(`✅ Trello card created: ${data.name}`);
      return response.data;
    } catch (error) {
      console.error('Error creating Trello card:', error);
      throw error;
    }
  }

  // Update a card
  async updateCard(cardId: string, data: {
    name?: string;
    desc?: string;
    idList?: string;
    idMembers?: string[];
    due?: string;
  }): Promise<TrelloCard> {
    try {
      const response = await axios.put(`${this.baseUrl}/cards/${cardId}`, {
        ...data,
        ...this.getAuthParams()
      });
      console.log(`✅ Trello card updated: ${cardId}`);
      return response.data;
    } catch (error) {
      console.error('Error updating Trello card:', error);
      throw error;
    }
  }

  // Search for cards with specific text in description
  async searchCards(boardId: string, searchTerm: string): Promise<TrelloCard[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          query: `board:${boardId} ${searchTerm}`,
          cards_limit: 50,
          ...this.getAuthParams()
        }
      });
      return response.data.cards || [];
    } catch (error) {
      console.error('Error searching Trello cards:', error);
      throw error;
    }
  }

  // Get cards from a specific list
  async getListCards(listId: string): Promise<TrelloCard[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/lists/${listId}/cards`, {
        params: this.getAuthParams()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching list cards:', error);
      throw error;
    }
  }

  // Move card to done list
  async moveCardToDone(cardId: string, doneListId: string): Promise<TrelloCard> {
    return this.updateCard(cardId, { idList: doneListId });
  }

  // Calculate due date based on subscription tier
  calculateDueDate(submissionDate: Date, subscriptionTier: string, isRevision = false): Date {
    const dueDate = new Date(submissionDate);
    
    if (isRevision) {
      // All revisions have 48 hour turnaround
      dueDate.setHours(dueDate.getHours() + 48);
    } else {
      // Initial video submission due dates by tier
      switch (subscriptionTier?.toLowerCase()) {
        case 'growth accelerator':
          dueDate.setHours(dueDate.getHours() + 48); // 48 hours
          break;
        case 'consistency club':
          dueDate.setDate(dueDate.getDate() + 4); // 4 days
          break;
        case 'creative spark':
          dueDate.setDate(dueDate.getDate() + 7); // 7 days
          break;
        default:
          // Default to 7 days for unknown tiers
          dueDate.setDate(dueDate.getDate() + 7);
          break;
      }
    }
    
    return dueDate;
  }

  // Get subscription label ID (creates if doesn't exist)
  async getSubscriptionLabelId(boardId: string, subscriptionTier: string): Promise<string | null> {
    try {
      // Get existing labels
      const labels = await this.getBoardLabels(boardId);
      
      // Check if subscription tier label already exists
      const existingLabel = labels.find(label => 
        label.name.toLowerCase() === subscriptionTier.toLowerCase()
      );
      
      if (existingLabel) {
        return existingLabel.id;
      }
      
      // Create new label with appropriate color
      let color = 'yellow'; // Default
      switch (subscriptionTier.toLowerCase()) {
        case 'growth accelerator':
          color = 'red'; // Premium tier - red
          break;
        case 'consistency club':
          color = 'orange'; // Mid tier - orange
          break;
        case 'creative spark':
          color = 'yellow'; // Basic tier - yellow
          break;
      }
      
      const newLabel = await this.createLabel(boardId, subscriptionTier, color);
      console.log(`✅ Created subscription label: ${subscriptionTier} (${color})`);
      return newLabel.id;
    } catch (error) {
      console.error('Error managing subscription label:', error);
      return null;
    }
  }

  // Format project data for Trello card
  formatProjectCard(project: any, user: any, subscription: any, frameioLink: string, tallyData?: any): {
    name: string;
    desc: string;
    start?: string; // ISO date string for Trello start date (submission date)
    due?: string; // ISO date string for Trello due date (based on subscription)
    subscriptionTier?: string; // For label creation
  } {
    let description = `**Project ID:** ${project.id}
**Client:** ${user.firstName} ${user.lastName} (${user.email})
**Company:** ${user.company || 'Not provided'}
**Frame.io Link:** ${frameioLink}

---
`;

    if (tallyData) {
      description += `**📋 CLIENT REQUIREMENTS & INSTRUCTIONS:**\n\n`;
      
      // Handle different Tally data formats
      if (tallyData.fields && Array.isArray(tallyData.fields)) {
        // Format: { fields: [{ label, value }] }
        tallyData.fields.forEach((field: any) => {
          if (field.label && field.value) {
            description += `**Q: ${field.label}**\n`;
            description += `A: ${field.value}\n\n`;
          }
        });
      } else if (typeof tallyData === 'object') {
        // Format: Direct object with key-value pairs
        Object.keys(tallyData).forEach((key) => {
          const value = tallyData[key];
          if (value && key !== 'submissionId' && key !== 'createdAt') {
            // Format field names (remove underscores, capitalize)
            const formattedKey = key
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (l: string) => l.toUpperCase());
            
            description += `**Q: ${formattedKey}**\n`;
            if (typeof value === 'object') {
              description += `A: ${JSON.stringify(value, null, 2)}\n\n`;
            } else {
              description += `A: ${value}\n\n`;
            }
          }
        });
      }
      
      description += `---\n\n`;
    }

    // Calculate dates if project was submitted
    let startDate: string | undefined;
    let dueDate: string | undefined;
    
    if (project.submittedToEditorAt) {
      const submissionDate = new Date(project.submittedToEditorAt);
      startDate = submissionDate.toISOString();
      dueDate = this.calculateDueDate(submissionDate, subscription?.tier, false).toISOString();
    }
    
    return {
      name: `${project.title} - ${user.firstName}`,
      desc: description,
      start: startDate,
      due: dueDate,
      subscriptionTier: subscription?.tier
    };
  }

  // Format revision card
  formatRevisionCard(project: any, user: any, subscription: any, frameioLink: string, shareLink: string, revisionCount: number): {
    name: string;
    desc: string;
    start?: string; // ISO date string for Trello start date (revision request date)
    due?: string; // ISO date string for Trello due date (48 hours from request)
    subscriptionTier?: string; // For label creation
  } {
    const description = `**Project ID:** ${project.id}
**Client:** ${user.firstName} ${user.lastName} (${user.email})
**Company:** ${user.company || 'Not provided'}
**Revision #:** ${revisionCount}
**Frame.io Link:** ${frameioLink}
**Review Link (for comments):** ${shareLink}

---
**🔄 REVISION REQUEST**
Please review the comments in Frame.io and make the requested changes.
`;

    // Calculate dates for revision (start = now, due = 48 hours from now)
    const revisionRequestDate = new Date();
    const startDate = revisionRequestDate.toISOString();
    const dueDate = this.calculateDueDate(revisionRequestDate, subscription?.tier, true).toISOString();

    return {
      name: `REVISION: ${project.title} - ${user.firstName} (Rev #${revisionCount})`,
      desc: description,
      start: startDate,
      due: dueDate,
      subscriptionTier: subscription?.tier
    };
  }
}

export const trelloService = new TrelloService();