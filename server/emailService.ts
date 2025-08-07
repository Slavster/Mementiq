import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  async sendEmail(template: EmailTemplate): Promise<void> {
    try {
      const { data, error } = await resend.emails.send({
        from: "Mementiq <noreply@mementiq.com>",
        to: template.to,
        subject: template.subject,
        html: template.html,
      });

      if (error) {
        console.error("Email sending error:", error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      console.log("Email sent successfully:", data?.id);
    } catch (error) {
      console.error("Email service error:", error);
      throw error;
    }
  }

  // Template for video delivery notification
  generateVideoDeliveryEmail(
    userEmail: string,
    projectTitle: string,
    downloadLink: string,
    projectId: number,
  ): EmailTemplate {
    return {
      to: userEmail,
      subject: `Your video "${projectTitle}" is ready for review!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Video is Ready</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🎬 Your Video is Ready!</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Project: ${projectTitle}</h2>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              Great news! Your video editing project has been completed and is ready for your review.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #667eea;">What's Next?</h3>
              <ol style="margin: 0; padding-left: 20px;">
                <li>Watch your video using the download link below</li>
                <li>Accept the final video or request a revision. Please visit your 
                <a href="${process.env.VITE_APP_URL || "https://mementiq.com"}/dashboard/projects/${projectId}">
                project dashboard</a> to complete this step.</li>
                <li>Download your video within 30 days</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${downloadLink}" 
                 style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin: 10px;">
                📥 Download Video
              </a>
              
              <a href="${process.env.VITE_APP_URL || "https://mementiq.com"}/dashboard" 
                 style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin: 10px;">
                🎯 Review in Dashboard
              </a>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #856404;">
                <strong>⏰ Important:</strong> Download links are available for 30 days. Make sure to save your video locally!
              </p>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              Questions? Reply to this email or contact our support team.
            </p>
          </div>
        </body>
        </html>
      `,
    };
  }

  // Template for project completion confirmation
  generateProjectCompletionEmail(
    userEmail: string,
    projectTitle: string,
    downloadLink: string,
  ): EmailTemplate {
    return {
      to: userEmail,
      subject: `Project "${projectTitle}" completed - Thank you!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Project Completed</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🎉 Project Completed!</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Thank You!</h2>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              Your project "<strong>${projectTitle}</strong>" has been successfully completed and accepted.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #28a745;">Download Your Completed Video</h3>
              <p style="margin: 0;">
                Your video will remain available for download for the next <strong>30 days</strong>. 
                Please save it to your local storage to ensure you have permanent access.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${downloadLink}" 
                 style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                📥 Download Your Completed Video
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              We appreciate your business and look forward to working with you again!
            </p>
          </div>
        </body>
        </html>
      `,
    };
  }

  // Template for revision instruction notification
  generateRevisionInstructionEmail(
    userEmail: string,
    projectTitle: string,
    reviewLink: string,
    projectId: number,
  ): EmailTemplate {
    return {
      to: userEmail,
      subject: `Ready to provide revision instructions for "${projectTitle}"`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Revision Instructions Ready</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #fd7e14 0%, #e83e8c 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">✏️ Ready for Revision Instructions</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Project: ${projectTitle}</h2>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              Your revision payment has been processed successfully! You can now provide detailed instructions for your video edits.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #fd7e14; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #fd7e14;">How to Provide Revision Instructions</h3>
              <ol style="margin: 0; padding-left: 20px;">
                <li><strong>Review your video</strong> using the Vimeo link below</li>
                <li><strong>Leave specific comments</strong> on any object in any frame by clicking on them </li>
                <li><strong>Be as detailed as possible</strong> - the more specific your feedback, the better the result</li>
                <li><strong>Upload additional video clips or photos via your dashboard</strong> if needed (optional)</li>
                <li><strong>Submit your instructions on the dashboard</strong> when ready</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${reviewLink}" 
                 style="background: #fd7e14; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin: 10px;">
                🎬 Review Video on Vimeo
              </a>
              
              <a href="${process.env.VITE_APP_URL || "https://mementiq.com"}/dashboard" 
                 style="background: #6f42c1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin: 10px;">
                📝 Provide Instructions
              </a>
            </div>
            
            <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #0c5460;">
                <strong>💡 Pro Tip:</strong> Click anywhere on the Vimeo video timeline to leave timestamp-specific comments. This helps our editors understand exactly what needs to be changed!
              </p>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              Questions? Reply to this email or contact our support team.
            </p>
          </div>
        </body>
        </html>
      `,
    };
  }

  // Send revision instructions email
  async sendRevisionInstructionsEmail(
    userEmail: string,
    userName: string,
    projectTitle: string,
    vimeoReviewLink: string,
  ) {
    const emailData = this.generateRevisionInstructionEmail(
      userEmail,
      projectTitle,
      vimeoReviewLink,
      0,
    );
    return await this.sendEmail(emailData);
  }
}

export const emailService = new EmailService();
