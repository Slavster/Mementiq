import { frameioV4Service } from '../frameioV4Service.js';
import { emailService } from '../emailService.js';
import { getAdminNotificationEmail } from '../config/admin.js';
import { getAppBaseUrl } from '../config/appUrl.js';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const SEVEN_DAYS_WARNING = 7;
const ONE_DAY_WARNING = 1;

let keepAliveInterval: NodeJS.Timeout | null = null;
let lastAlertSentDays: number | null = null;

async function checkAndRefreshToken(): Promise<void> {
  console.log('🔄 Token Keep-Alive: Checking Frame.io token status...');
  
  try {
    const status = frameioV4Service.getTokenStatus();
    const adminEmail = getAdminNotificationEmail();
    const baseUrl = getAppBaseUrl();
    const clientId = process.env.ADOBE_CLIENT_ID;

    // Generate Adobe OAuth URL or fallback to admin settings
    let adobeAuthUrl = `${baseUrl}/admin/settings`;
    if (clientId) {
      const state = Math.random().toString(36).substring(7);
      const { storage: storageLocal } = await import('../storage.js');
      await storageLocal.createOAuthState(state, "frameio", 10);
      const stableRedirectUri = `${baseUrl}/api/auth/frameio/callback`;
      adobeAuthUrl = `https://ims-na1.adobelogin.com/ims/authorize/v2?client_id=${clientId}&redirect_uri=${encodeURIComponent(stableRedirectUri)}&response_type=code&scope=openid profile offline_access email additional_info.roles&state=${state}`;
    }

    console.log(`📊 Token status: ${status.status}, Days remaining: ${status.daysRemaining}`);

    if (status.status === 'disconnected') {
      console.log('⚠️ Token Keep-Alive: No token available - OAuth required');

      if (adminEmail && lastAlertSentDays !== 0) {
        try {
          await emailService.sendTokenExpiredAlert(
            adminEmail,
            adobeAuthUrl,
            'No authentication token found. Please reconnect Frame.io.'
          );
          lastAlertSentDays = 0;
        } catch (emailError) {
          console.error('Failed to send token alert email:', emailError);
        }
      }
      return;
    }

    if (status.status === 'expired') {
      console.log('🔴 Token Keep-Alive: Token expired, attempting refresh...');

      const refreshResult = await frameioV4Service.manualRefresh();

      if (!refreshResult.success) {
        console.error('❌ Token refresh failed:', refreshResult.error);

        if (adminEmail && lastAlertSentDays !== 0) {
          try {
            await emailService.sendTokenExpiredAlert(
              adminEmail,
              adobeAuthUrl,
              refreshResult.error
            );
            lastAlertSentDays = 0;
          } catch (emailError) {
            console.error('Failed to send token expired email:', emailError);
          }
        }
      } else {
        console.log('✅ Token refreshed successfully');
        lastAlertSentDays = null;
      }
      return;
    }

    if (status.status === 'expiring_soon' && status.daysRemaining !== null) {
      console.log(`⚠️ Token Keep-Alive: Token expiring in ${status.daysRemaining} days`);

      const refreshResult = await frameioV4Service.manualRefresh();

      if (refreshResult.success) {
        console.log('✅ Token proactively refreshed');
        lastAlertSentDays = null;
      } else {
        console.log('⚠️ Proactive refresh failed, sending alert...');

        if (adminEmail) {
          const shouldAlert =
            (status.daysRemaining <= ONE_DAY_WARNING && lastAlertSentDays !== 1) ||
            (status.daysRemaining <= SEVEN_DAYS_WARNING && lastAlertSentDays !== 7 && lastAlertSentDays !== 1);

          if (shouldAlert) {
            try {
              await emailService.sendTokenExpiringAlert(
                adminEmail,
                status.daysRemaining,
                adobeAuthUrl
              );
              lastAlertSentDays = status.daysRemaining <= ONE_DAY_WARNING ? 1 : 7;
            } catch (emailError) {
              console.error('Failed to send token expiring email:', emailError);
            }
          }
        }
      }
      return;
    }
    
    if (status.status === 'connected' && status.hasRefreshToken) {
      console.log('✅ Token Keep-Alive: Token is healthy, performing proactive refresh...');
      
      const refreshResult = await frameioV4Service.manualRefresh();
      
      if (refreshResult.success) {
        console.log('✅ Token proactively refreshed to extend validity');
        lastAlertSentDays = null;
      } else {
        console.log('⚠️ Proactive refresh failed (token still valid):', refreshResult.error);
      }
    }
    
  } catch (error) {
    console.error('❌ Token Keep-Alive error:', error);
  }
}

export function startTokenKeepAlive(): void {
  if (keepAliveInterval) {
    console.log('🔄 Token Keep-Alive: Already running');
    return;
  }
  
  console.log('🚀 Starting Token Keep-Alive service (12-hour cycle)...');
  
  setTimeout(() => {
    checkAndRefreshToken().catch(console.error);
  }, 30000);
  
  keepAliveInterval = setInterval(() => {
    checkAndRefreshToken().catch(console.error);
  }, TWELVE_HOURS_MS);
  
  console.log('✅ Token Keep-Alive service started');
}

export function stopTokenKeepAlive(): void {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
    console.log('🛑 Token Keep-Alive service stopped');
  }
}

export async function forceTokenCheck(): Promise<void> {
  await checkAndRefreshToken();
}
