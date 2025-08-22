import { trelloService } from './trello.js';
import { db } from '../db.js';
import { trelloCards, trelloConfig, projects, users, tallyFormSubmissions } from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';

export class TrelloAutomationService {
  private static instance: TrelloAutomationService;
  private config: any = null;

  static getInstance(): TrelloAutomationService {
    if (!TrelloAutomationService.instance) {
      TrelloAutomationService.instance = new TrelloAutomationService();
    }
    return TrelloAutomationService.instance;
  }

  // Get Trello configuration (board and lists)
  async getTrelloConfig() {
    if (this.config) return this.config;
    
    try {
      const configs = await db.select().from(trelloConfig).limit(1);
      if (configs.length > 0) {
        this.config = configs[0];
        return this.config;
      }
      return null;
    } catch (error) {
      console.error('Error fetching Trello config:', error);
      return null;
    }
  }

  // Setup initial Trello configuration
  async setupTrelloConfig(boardId: string, todoListId: string, doneListId: string, revisionListId?: string) {
    try {
      await db.insert(trelloConfig).values({
        boardId,
        todoListId,
        doneListId,
        revisionListId,
        updatedAt: new Date()
      }).onConflictDoUpdate({
        target: trelloConfig.id,
        set: {
          boardId,
          todoListId,
          doneListId,
          revisionListId,
          updatedAt: new Date()
        }
      });
      
      // Clear cached config
      this.config = null;
      console.log('✅ Trello configuration updated');
    } catch (error) {
      console.error('Error setting up Trello config:', error);
      throw error;
    }
  }

  // 1. Create initial project card when submitted to editor
  async createProjectCard(projectId: number): Promise<string | null> {
    try {
      const config = await this.getTrelloConfig();
      if (!config) {
        console.log('⚠️ No Trello configuration found');
        return null;
      }

      // Get project details with user and subscription info
      const projectData = await db
        .select({
          project: projects,
          user: users
        })
        .from(projects)
        .leftJoin(users, eq(projects.userId, users.id))
        .where(eq(projects.id, projectId))
        .limit(1);

      if (projectData.length === 0) {
        console.error(`Project ${projectId} not found`);
        return null;
      }

      const { project, user } = projectData[0];
      if (!user) {
        console.error(`User not found for project ${projectId}`);
        return null;
      }

      // Get Tally form submission data
      const tallyData = await db
        .select()
        .from(tallyFormSubmissions)
        .where(eq(tallyFormSubmissions.projectId, projectId))
        .limit(1);

      const parsedTallyData = tallyData.length > 0 
        ? JSON.parse(tallyData[0].submissionData || '{}')
        : null;

      // Build Frame.io link (project folder)
      const frameioLink = project.mediaFolderId 
        ? `https://app.frame.io/library/${project.mediaFolderId}`
        : 'Frame.io folder not created yet';

      // Get user subscription info
      const subscriptionTier = user.subscriptionTier || 'Free';

      // Format card data
      const cardData = trelloService.formatProjectCard(
        project, 
        user, 
        { tier: subscriptionTier },
        frameioLink,
        parsedTallyData
      );

      // Create the Trello card
      const card = await trelloService.createCard({
        name: cardData.name,
        desc: cardData.desc,
        idList: config.todoListId
      });

      // Store the card reference in database
      await db.insert(trelloCards).values({
        projectId: projectId,
        cardId: card.id,
        cardType: 'initial',
        revisionNumber: 0,
        boardId: config.boardId,
        listId: config.todoListId
      });

      // Also update the project record with the initial Trello card ID
      await db.update(projects)
        .set({ trelloCardId: card.id })
        .where(eq(projects.id, projectId));

      console.log(`✅ Created Trello card for project ${projectId}: ${card.name}`);
      return card.id;
    } catch (error) {
      console.error('Error creating project Trello card:', error);
      return null;
    }
  }

  // 2. Move card to done when video is ready
  async markProjectComplete(projectId: number): Promise<boolean> {
    try {
      const config = await this.getTrelloConfig();
      if (!config) return false;

      // Find the initial project card
      const cardRecords = await db
        .select()
        .from(trelloCards)
        .where(
          and(
            eq(trelloCards.projectId, projectId),
            eq(trelloCards.cardType, 'initial')
          )
        );

      if (cardRecords.length === 0) {
        console.log(`No Trello card found for project ${projectId}`);
        return false;
      }

      const cardRecord = cardRecords[0];

      // Move card to done list
      await trelloService.moveCardToDone(cardRecord.cardId, config.doneListId);

      // Update database record
      await db
        .update(trelloCards)
        .set({ 
          listId: config.doneListId,
          completedAt: new Date()
        })
        .where(eq(trelloCards.id, cardRecord.id));

      console.log(`✅ Moved project ${projectId} card to Done`);
      return true;
    } catch (error) {
      console.error('Error marking project complete in Trello:', error);
      return false;
    }
  }

  // 3. Create revision card and assign to same editor
  async createRevisionCard(projectId: number, revisionCount: number): Promise<string | null> {
    try {
      const config = await this.getTrelloConfig();
      if (!config) return null;

      // Get project details
      const projectData = await db
        .select({
          project: projects,
          user: users
        })
        .from(projects)
        .leftJoin(users, eq(projects.userId, users.id))
        .where(eq(projects.id, projectId))
        .limit(1);

      if (projectData.length === 0) return null;

      const { project, user } = projectData[0];
      if (!user) return null;

      // Find the original project card to get assigned editor
      let assignedEditorId = null;
      const originalCards = await db
        .select()
        .from(trelloCards)
        .where(
          and(
            eq(trelloCards.projectId, projectId),
            eq(trelloCards.cardType, 'initial')
          )
        );

      if (originalCards.length > 0) {
        assignedEditorId = originalCards[0].assignedEditorId;
      }

      // Build links
      const frameioLink = project.mediaFolderId 
        ? `https://app.frame.io/library/${project.mediaFolderId}`
        : 'Frame.io folder not available';

      const shareLink = project.frameioReviewLink || 'Review link not available';

      // Format revision card
      const subscriptionTier = user.subscriptionTier || 'Free';
      const cardData = trelloService.formatRevisionCard(
        project,
        user,
        { tier: subscriptionTier },
        frameioLink,
        shareLink,
        revisionCount
      );

      // Determine which list to use
      const listId = config.revisionListId || config.todoListId;

      // Create the revision card
      const cardCreateData: any = {
        name: cardData.name,
        desc: cardData.desc,
        idList: listId
      };

      // Add assigned editor if we have one
      if (assignedEditorId) {
        cardCreateData.idMembers = [assignedEditorId];
      }

      const card = await trelloService.createCard(cardCreateData);

      // Store the card reference
      await db.insert(trelloCards).values({
        projectId: projectId,
        cardId: card.id,
        cardType: 'revision',
        revisionNumber: revisionCount,
        boardId: config.boardId,
        listId: listId,
        assignedEditorId: assignedEditorId
      });

      console.log(`✅ Created revision card for project ${projectId} (revision #${revisionCount})`);
      return card.id;
    } catch (error) {
      console.error('Error creating revision card:', error);
      return null;
    }
  }

  // 4. Mark revision as complete
  async markRevisionComplete(projectId: number, revisionNumber: number): Promise<boolean> {
    try {
      const config = await this.getTrelloConfig();
      if (!config) return false;

      // Find the revision card
      const cardRecords = await db
        .select()
        .from(trelloCards)
        .where(
          and(
            eq(trelloCards.projectId, projectId),
            eq(trelloCards.cardType, 'revision'),
            eq(trelloCards.revisionNumber, revisionNumber)
          )
        );

      if (cardRecords.length === 0) {
        console.log(`No revision card found for project ${projectId}, revision ${revisionNumber}`);
        return false;
      }

      const cardRecord = cardRecords[0];

      // Move to done
      await trelloService.moveCardToDone(cardRecord.cardId, config.doneListId);

      // Update database
      await db
        .update(trelloCards)
        .set({
          listId: config.doneListId,
          completedAt: new Date()
        })
        .where(eq(trelloCards.id, cardRecord.id));

      console.log(`✅ Marked revision ${revisionNumber} complete for project ${projectId}`);
      return true;
    } catch (error) {
      console.error('Error marking revision complete:', error);
      return false;
    }
  }

  // Get all Trello cards for a project (for debugging)
  async getProjectCards(projectId: number) {
    return await db
      .select()
      .from(trelloCards)
      .where(eq(trelloCards.projectId, projectId));
  }
}

export const trelloAutomation = TrelloAutomationService.getInstance();