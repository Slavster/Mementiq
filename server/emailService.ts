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
}

export const emailService = new EmailService();
