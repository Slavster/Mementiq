import { trelloService } from './trello.js';
import { db } from '../db.js';
import { trelloCards, trelloConfig, projects, users, tallyFormSubmissions } from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { frameioV4Service } from '../frameioV4Service.js';

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
  async setupTrelloConfig(boardId: string, todoListId: string, doneListId: string, revisionListId?: string, waitingOnApprovalListId?: string) {
    try {
      await db.insert(trelloConfig).values({
        boardId,
        todoListId,
        doneListId,
        revisionListId,
        waitingOnApprovalListId,
        updatedAt: new Date()
      }).onConflictDoUpdate({
        target: trelloConfig.id,
        set: {
          boardId,
          todoListId,
          doneListId,
          revisionListId,
          waitingOnApprovalListId,
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

      // Build Frame.io link (project folder) - use correct V4 format
      let frameioLink = 'Frame.io folder not created yet';
      
      if (project.mediaFolderId) {
        try {
          // Get the Frame.io project ID for the correct URL format
          const frameioProjectId = await frameioV4Service.getProjectIdFromFolder(project.mediaFolderId);
          
          if (frameioProjectId) {
            frameioLink = `https://next.frame.io/project/${frameioProjectId}/view/${project.mediaFolderId}`;
          } else {
            // Fallback to library URL if project ID not found
            frameioLink = `https://app.frame.io/library/${project.mediaFolderId}`;
          }
        } catch (error) {
          console.error('Failed to get Frame.io project ID:', error);
          // Fallback to library URL on error
          frameioLink = `https://app.frame.io/library/${project.mediaFolderId}`;
        }
      }

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

      // Get subscription label ID
      let labelIds: string[] = [];
      if (cardData.subscriptionTier) {
        const labelId = await trelloService.getSubscriptionLabelId(config.boardId, cardData.subscriptionTier);
        if (labelId) {
          labelIds.push(labelId);
        }
      }

      // Create the Trello card with dates and labels
      const card = await trelloService.createCard({
        name: cardData.name,
        desc: cardData.desc,
        idList: config.todoListId,
        start: cardData.start,
        due: cardData.due,
        idLabels: labelIds
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

  // 2. Move card to waiting on approval when video is ready
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

      // Determine target list - use waiting on approval if configured, otherwise done
      const targetListId = config.waitingOnApprovalListId || config.doneListId;
      const targetListName = config.waitingOnApprovalListId ? 'Waiting on Approval' : 'Done';

      // Check if card is already in the target list
      if (cardRecord.listId === targetListId) {
        console.log(`Card for project ${projectId} is already in ${targetListName} list`);
        return true;
      }

      // Move card to target list
      await trelloService.moveCard(cardRecord.cardId, targetListId);

      // Update database record
      await db
        .update(trelloCards)
        .set({ 
          listId: targetListId,
          // Only set completedAt if moving to done list
          ...(targetListId === config.doneListId ? { completedAt: new Date() } : {})
        })
        .where(eq(trelloCards.id, cardRecord.id));

      console.log(`✅ Moved project ${projectId} card to ${targetListName}`);
      return true;
    } catch (error) {
      console.error('Error moving project card in Trello:', error);
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

      // Build links - use correct V4 format
      let frameioLink = 'Frame.io folder not available';
      
      if (project.mediaFolderId) {
        try {
          // Get the Frame.io project ID for the correct URL format
          const frameioProjectId = await frameioV4Service.getProjectIdFromFolder(project.mediaFolderId);
          
          if (frameioProjectId) {
            frameioLink = `https://next.frame.io/project/${frameioProjectId}/view/${project.mediaFolderId}`;
          } else {
            // Fallback to library URL if project ID not found
            frameioLink = `https://app.frame.io/library/${project.mediaFolderId}`;
          }
        } catch (error) {
          console.error('Failed to get Frame.io project ID for revision:', error);
          // Fallback to library URL on error
          frameioLink = `https://app.frame.io/library/${project.mediaFolderId}`;
        }
      }

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

      // Get subscription label ID
      let labelIds: string[] = [];
      if (cardData.subscriptionTier) {
        const labelId = await trelloService.getSubscriptionLabelId(config.boardId, cardData.subscriptionTier);
        if (labelId) {
          labelIds.push(labelId);
        }
      }

      // Create the revision card
      const cardCreateData: any = {
        name: cardData.name,
        desc: cardData.desc,
        idList: listId,
        start: cardData.start,
        due: cardData.due,
        idLabels: labelIds
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

      // Create bidirectional links between original and revision cards
      if (originalCards.length > 0) {
        await trelloService.linkCards(
          originalCards[0].cardId,
          card.id,
          project.title,
          revisionCount
        );
      }

      console.log(`✅ Created revision card for project ${projectId} (revision #${revisionCount})`);
      return card.id;
    } catch (error) {
      console.error('Error creating revision card:', error);
      return null;
    }
  }

  // 4. Mark revision as complete (video ready - move to waiting on approval)
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

      // Determine target list - use waiting on approval if configured, otherwise done
      const targetListId = config.waitingOnApprovalListId || config.doneListId;
      const targetListName = config.waitingOnApprovalListId ? 'Waiting on Approval' : 'Done';

      // Check if card is already in the target list
      if (cardRecord.listId === targetListId) {
        console.log(`Revision card for project ${projectId} revision ${revisionNumber} is already in ${targetListName} list`);
        return true;
      }

      // Move to target list
      await trelloService.moveCard(cardRecord.cardId, targetListId);

      // Update database
      await db
        .update(trelloCards)
        .set({
          listId: targetListId,
          // Only set completedAt if moving to done list
          ...(targetListId === config.doneListId ? { completedAt: new Date() } : {})
        })
        .where(eq(trelloCards.id, cardRecord.id));

      console.log(`✅ Moved revision ${revisionNumber} for project ${projectId} to ${targetListName}`);
      return true;
    } catch (error) {
      console.error('Error moving revision card:', error);
      return false;
    }
  }

  // 5. Move card from waiting on approval to done (when actually approved)
  async markProjectApproved(projectId: number, isRevision: boolean = false, revisionNumber?: number): Promise<boolean> {
    try {
      const config = await this.getTrelloConfig();
      if (!config || !config.waitingOnApprovalListId) return false;

      // Find the appropriate card
      const cardQuery = isRevision && revisionNumber !== undefined ? 
        and(
          eq(trelloCards.projectId, projectId),
          eq(trelloCards.cardType, 'revision'),
          eq(trelloCards.revisionNumber, revisionNumber)
        ) :
        and(
          eq(trelloCards.projectId, projectId),
          eq(trelloCards.cardType, 'initial')
        );

      const cardRecords = await db
        .select()
        .from(trelloCards)
        .where(cardQuery);

      if (cardRecords.length === 0) {
        console.log(`No card found for project ${projectId}${isRevision ? ` revision ${revisionNumber}` : ''}`);
        return false;
      }

      const cardRecord = cardRecords[0];

      // Only move if currently in waiting on approval
      if (cardRecord.listId !== config.waitingOnApprovalListId) {
        console.log(`Card for project ${projectId} is not in Waiting on Approval list`);
        return false;
      }

      // Move to done
      await trelloService.moveCard(cardRecord.cardId, config.doneListId);

      // Update database
      await db
        .update(trelloCards)
        .set({
          listId: config.doneListId,
          completedAt: new Date()
        })
        .where(eq(trelloCards.id, cardRecord.id));

      const cardType = isRevision ? `revision ${revisionNumber}` : 'project';
      console.log(`✅ Approved and moved ${cardType} ${projectId} to Done`);
      return true;
    } catch (error) {
      console.error('Error approving project:', error);
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