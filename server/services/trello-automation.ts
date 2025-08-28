import { trelloService } from './trello.js';
import { db } from '../db.js';
import { trelloCards, trelloConfig, projects, users, tallyFormSubmissions } from '../../shared/schema.js';
import { eq, and, desc } from 'drizzle-orm';
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

      // Build Frame.io link (project folder) - use correct V4 format with robust fallbacks
      let frameioLink = 'Frame.io folder not created yet';
      
      if (project.mediaFolderId) {
        // Fallback 1: Use stored project link from database
        if (project.frameioProjectLink) {
          frameioLink = project.frameioProjectLink;
          console.log('✅ Using stored Frame.io project link from database');
        } else {
          // Fallback 2: Try to generate the correct V4 project link
          try {
            const frameioProjectId = await frameioV4Service.getProjectIdFromFolder(project.mediaFolderId);
            
            if (frameioProjectId) {
              frameioLink = `https://next.frame.io/project/${frameioProjectId}/view/${project.mediaFolderId}`;
              console.log('✅ Generated correct Frame.io V4 project link');
              
              // Store the generated link for future use
              try {
                await db.update(projects)
                  .set({ frameioProjectLink: frameioLink })
                  .where(eq(projects.id, projectId));
                console.log('💾 Stored Frame.io project link in database for future use');
              } catch (storeError) {
                console.log('⚠️ Failed to store Frame.io project link:', storeError instanceof Error ? storeError.message : storeError);
              }
            } else {
              console.log('❌ Could not determine Frame.io project ID');
              frameioLink = 'Frame.io project link unavailable - please check project setup';
            }
          } catch (error) {
            console.error('❌ Failed to get Frame.io project ID:', error instanceof Error ? error instanceof Error ? error.message : error : error);
            frameioLink = 'Frame.io project link unavailable - authentication required';
          }
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

  // 2. Move card to done when video is accepted (button click)
  async markProjectComplete(projectId: number, isRevisionRequest: boolean = false): Promise<boolean> {
    try {
      const config = await this.getTrelloConfig();
      if (!config) return false;

      if (isRevisionRequest) {
        // For revision requests, move BOTH original card AND all revision cards to Done
        let success = true;

        // 1. Move original card to Done (if not already)
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
          const originalCard = originalCards[0];
          
          if (originalCard.listId !== config.doneListId) {
            try {
              await trelloService.moveCardToDone(originalCard.cardId, config.doneListId);
              await db
                .update(trelloCards)
                .set({ 
                  listId: config.doneListId,
                  completedAt: new Date()
                })
                .where(eq(trelloCards.id, originalCard.id));
              console.log(`✅ Moved original card to Done for project ${projectId}`);
            } catch (error: any) {
              // Check if error indicates card is archived
              if (error instanceof Error ? error.message : error && (error instanceof Error ? error.message : error.includes('archived') || error instanceof Error ? error.message : error.includes('closed') || error instanceof Error ? error.message : error.includes('not found'))) {
                console.log(`📁 Original card appears to be archived for project ${projectId} - leaving archived`);
              } else {
                console.error(`Failed to move original card for project ${projectId}:`, error);
                success = false;
              }
            }
          } else {
            console.log(`✅ Original card already in Done for project ${projectId}`);
          }
        }

        // 2. Move all revision cards to Done (if not already)
        const revisionCards = await db
          .select()
          .from(trelloCards)
          .where(
            and(
              eq(trelloCards.projectId, projectId),
              eq(trelloCards.cardType, 'revision')
            )
          )
          .orderBy(desc(trelloCards.revisionNumber));

        for (const revisionCard of revisionCards) {
          if (revisionCard.listId !== config.doneListId) {
            try {
              await trelloService.moveCardToDone(revisionCard.cardId, config.doneListId);
              await db
                .update(trelloCards)
                .set({ 
                  listId: config.doneListId,
                  completedAt: new Date()
                })
                .where(eq(trelloCards.id, revisionCard.id));
              console.log(`✅ Moved revision card #${revisionCard.revisionNumber} to Done for project ${projectId}`);
            } catch (error: any) {
              // Check if error indicates card is archived
              if (error instanceof Error ? error.message : error && (error instanceof Error ? error.message : error.includes('archived') || error instanceof Error ? error.message : error.includes('closed') || error instanceof Error ? error.message : error.includes('not found'))) {
                console.log(`📁 Revision card #${revisionCard.revisionNumber} appears to be archived for project ${projectId} - leaving archived`);
              } else {
                console.error(`Failed to move revision card #${revisionCard.revisionNumber} for project ${projectId}:`, error);
                success = false;
              }
            }
          } else {
            console.log(`✅ Revision card #${revisionCard.revisionNumber} already in Done for project ${projectId}`);
          }
        }

        return success;
      } else {
        // For regular completion, move ALL cards (initial + any pending revision cards) to Done
        let success = true;

        // 1. Move initial card to Done
        const initialCards = await db
          .select()
          .from(trelloCards)
          .where(
            and(
              eq(trelloCards.projectId, projectId),
              eq(trelloCards.cardType, 'initial')
            )
          );

        if (initialCards.length > 0) {
          const initialCard = initialCards[0];
          
          if (initialCard.listId !== config.doneListId) {
            try {
              await trelloService.moveCardToDone(initialCard.cardId, config.doneListId);
              await db
                .update(trelloCards)
                .set({ 
                  listId: config.doneListId,
                  completedAt: new Date()
                })
                .where(eq(trelloCards.id, initialCard.id));
              console.log(`✅ Moved initial card to Done for project ${projectId}`);
            } catch (error: any) {
              // Check if error indicates card is archived
              if (error instanceof Error ? error.message : error && (error instanceof Error ? error.message : error.includes('archived') || error instanceof Error ? error.message : error.includes('closed') || error instanceof Error ? error.message : error.includes('not found'))) {
                console.log(`📁 Initial card appears to be archived for project ${projectId} - leaving archived`);
              } else {
                console.error(`Failed to move initial card for project ${projectId}:`, error);
                success = false;
              }
            }
          } else {
            console.log(`✅ Initial card already in Done for project ${projectId}`);
          }
        } else {
          console.log(`No initial Trello card found for project ${projectId}`);
        }

        // 2. Move any pending revision cards to Done  
        const revisionCards = await db
          .select()
          .from(trelloCards)
          .where(
            and(
              eq(trelloCards.projectId, projectId),
              eq(trelloCards.cardType, 'revision')
            )
          )
          .orderBy(desc(trelloCards.revisionNumber));

        for (const revisionCard of revisionCards) {
          if (revisionCard.listId !== config.doneListId) {
            try {
              await trelloService.moveCardToDone(revisionCard.cardId, config.doneListId);
              await db
                .update(trelloCards)
                .set({ 
                  listId: config.doneListId,
                  completedAt: new Date()
                })
                .where(eq(trelloCards.id, revisionCard.id));
              console.log(`✅ Moved pending revision card #${revisionCard.revisionNumber} to Done for project ${projectId}`);
            } catch (error: any) {
              // Check if error indicates card is archived
              if (error instanceof Error ? error.message : error && (error instanceof Error ? error.message : error.includes('archived') || error instanceof Error ? error.message : error.includes('closed') || error instanceof Error ? error.message : error.includes('not found'))) {
                console.log(`📁 Revision card #${revisionCard.revisionNumber} appears to be archived for project ${projectId} - leaving archived`);
              } else {
                console.error(`Failed to move revision card #${revisionCard.revisionNumber} for project ${projectId}:`, error);
                success = false;
              }
            }
          } else {
            console.log(`✅ Revision card #${revisionCard.revisionNumber} already in Done for project ${projectId}`);
          }
        }

        return success;
      }
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

      // Build Frame.io link for revision with triple fallback system
      let frameioLink = 'Frame.io folder not available';
      
      if (project.mediaFolderId) {
        // Fallback 1: Use stored project link from database
        if (project.frameioProjectLink) {
          frameioLink = project.frameioProjectLink;
          console.log('✅ REVISION: Using stored Frame.io project link from database');
        } else {
          // Fallback 2: Try to generate the correct V4 project link
          try {
            const frameioProjectId = await frameioV4Service.getProjectIdFromFolder(project.mediaFolderId);
            
            if (frameioProjectId) {
              frameioLink = `https://next.frame.io/project/${frameioProjectId}/view/${project.mediaFolderId}`;
              console.log('✅ REVISION: Generated correct Frame.io V4 project link');
              
              // Store for future use
              try {
                await db.update(projects)
                  .set({ frameioProjectLink: frameioLink })
                  .where(eq(projects.id, projectId));
              } catch (storeError) {
                console.log('⚠️ REVISION: Failed to store Frame.io project link');
              }
            } else {
              console.log('⚠️ REVISION: Could not determine Frame.io project ID, trying original card fallback');
              frameioLink = await this.getFrameioLinkFromOriginalCard(projectId);
            }
          } catch (error) {
            console.error('❌ REVISION: Failed to get Frame.io project ID, trying original card fallback');
            frameioLink = await this.getFrameioLinkFromOriginalCard(projectId);
          }
        }
      } else {
        // Fallback 3: Try to get from original card if no media folder ID
        frameioLink = await this.getFrameioLinkFromOriginalCard(projectId);
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

  // 4. Mark revision as complete (video accepted - move to done)
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

  // 5. Move card to waiting on approval when video is ready (automatic)
  async moveToWaitingOnApproval(projectId: number, isRevision: boolean = false, revisionNumber?: number): Promise<boolean> {
    try {
      const config = await this.getTrelloConfig();
      if (!config || !config.waitingOnApprovalListId) {
        console.log(`⚠️ No Waiting on Approval list configured, skipping card move for project ${projectId}`);
        return false;
      }

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

      // Check if card is already in waiting on approval
      if (cardRecord.listId === config.waitingOnApprovalListId) {
        console.log(`Card for project ${projectId}${isRevision ? ` revision ${revisionNumber}` : ''} is already in Waiting on Approval list`);
        return true;
      }

      // Move to waiting on approval
      await trelloService.moveCard(cardRecord.cardId, config.waitingOnApprovalListId);

      // Update database
      await db
        .update(trelloCards)
        .set({
          listId: config.waitingOnApprovalListId
          // Don't set completedAt yet - that happens when moved to Done
        })
        .where(eq(trelloCards.id, cardRecord.id));

      const cardType = isRevision ? `revision ${revisionNumber}` : 'project';
      console.log(`✅ Moved ${cardType} ${projectId} to Waiting on Approval`);
      return true;
    } catch (error) {
      console.error('Error moving to waiting on approval:', error);
      return false;
    }
  }

  // 6. Move card from waiting on approval to done (when actually approved)
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

  // Helper method: Extract Frame.io link from original card description as fallback
  private async getFrameioLinkFromOriginalCard(projectId: number): Promise<string> {
    try {
      console.log(`🔍 FALLBACK: Extracting Frame.io link from original card for project ${projectId}`);
      
      // Find the original card
      const originalCards = await db
        .select()
        .from(trelloCards)
        .where(
          and(
            eq(trelloCards.projectId, projectId),
            eq(trelloCards.cardType, 'initial')
          )
        );

      if (originalCards.length === 0) {
        console.log('⚠️ FALLBACK: No original card found');
        return 'Frame.io link unavailable - original card not found';
      }

      const originalCardId = originalCards[0].cardId;
      
      // Get the card description from Trello
      try {
        const cardData = await trelloService.makeRequest('GET', `/cards/${originalCardId}?fields=desc`);
        const description = cardData.desc || '';
        
        // Extract Frame.io link from description using regex
        // Look for https://next.frame.io/project/ URLs (V4 format)
        const frameioLinkMatch = description.match(/https:\/\/next\.frame\.io\/project\/[^\s]+/);
        
        if (frameioLinkMatch) {
          const extractedLink = frameioLinkMatch[0];
          console.log(`✅ FALLBACK: Successfully extracted Frame.io link from original card: ${extractedLink}`);
          return extractedLink;
        } else {
          console.log('⚠️ FALLBACK: No V4 Frame.io link found in original card description');
          return 'Frame.io link unavailable - not found in original card';
        }
        
      } catch (trelloError) {
        console.error('❌ FALLBACK: Failed to fetch original card from Trello:', trelloError.message);
        return 'Frame.io link unavailable - could not access original card';
      }
      
    } catch (error) {
      console.error('❌ FALLBACK: Error extracting Frame.io link from original card:', error instanceof Error ? error.message : error);
      return 'Frame.io link unavailable - extraction failed';
    }
  }
}

export const trelloAutomation = TrelloAutomationService.getInstance();