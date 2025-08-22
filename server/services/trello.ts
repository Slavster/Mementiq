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
  } {
    const creationDate = new Date().toLocaleDateString();
    
    let description = `**Project ID:** ${project.id}
**Client:** ${user.firstName} ${user.lastName}
**Subscription:** ${subscription?.tier || 'Unknown'}
**Created:** ${creationDate}
**Frame.io Link:** ${frameioLink}

---
`;

    if (tallyData && tallyData.fields) {
      description += `**Project Instructions:**\n`;
      tallyData.fields.forEach((field: any) => {
        if (field.label && field.value) {
          description += `**${field.label}:** ${field.value}\n`;
        }
      });
    }

    return {
      name: `${project.title} - ${user.firstName}`,
      desc: description
    };
  }

  // Format revision card
  formatRevisionCard(project: any, user: any, subscription: any, frameioLink: string, shareLink: string, revisionCount: number): {
    name: string;
    desc: string;
  } {
    const creationDate = new Date().toLocaleDateString();
    
    const description = `**Project ID:** ${project.id}
**Client:** ${user.firstName} ${user.lastName}
**Subscription:** ${subscription?.tier || 'Unknown'}
**Revision #:** ${revisionCount}
**Created:** ${creationDate}
**Frame.io Link:** ${frameioLink}
**Review Link (for comments):** ${shareLink}

---
**REVISION REQUEST**
Please review the comments in Frame.io and make the requested changes.
`;

    return {
      name: `REVISION: ${project.title} - ${user.firstName} (Rev #${revisionCount})`,
      desc: description
    };
  }
}

export const trelloService = new TrelloService();