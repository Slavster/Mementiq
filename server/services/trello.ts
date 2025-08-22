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
    due?: string;
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

  // Format project data for Trello card
  formatProjectCard(project: any, user: any, subscription: any, frameioLink: string, tallyData?: any): {
    name: string;
    desc: string;
    due?: string; // ISO date string for Trello due date
  } {
    let description = `**Project ID:** ${project.id}
**Client:** ${user.firstName} ${user.lastName} (${user.email})
**Company:** ${user.company || 'Not provided'}
**Subscription:** ${subscription?.tier || 'Unknown'}
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

    // Use submission date as due date if available
    const dueDate = project.submittedToEditorAt ? new Date(project.submittedToEditorAt).toISOString() : undefined;
    
    return {
      name: `${project.title} - ${user.firstName}`,
      desc: description,
      due: dueDate
    };
  }

  // Format revision card
  formatRevisionCard(project: any, user: any, subscription: any, frameioLink: string, shareLink: string, revisionCount: number): {
    name: string;
    desc: string;
    due?: string; // ISO date string for Trello due date
  } {
    const description = `**Project ID:** ${project.id}
**Client:** ${user.firstName} ${user.lastName} (${user.email})
**Company:** ${user.company || 'Not provided'}
**Subscription:** ${subscription?.tier || 'Unknown'}
**Revision #:** ${revisionCount}
**Frame.io Link:** ${frameioLink}
**Review Link (for comments):** ${shareLink}

---
**🔄 REVISION REQUEST**
Please review the comments in Frame.io and make the requested changes.
`;

    return {
      name: `REVISION: ${project.title} - ${user.firstName} (Rev #${revisionCount})`,
      desc: description
    };
  }
}

export const trelloService = new TrelloService();