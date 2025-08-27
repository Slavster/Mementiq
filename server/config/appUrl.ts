// Application URL configuration - centralized URL management for emails and redirects
export function getAppBaseUrl(): string {
  // Production check - if environment suggests production deployment
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_URL || process.env.NETLIFY_URL) {
    // Use production URL when available
    if (process.env.PRODUCTION_URL) {
      return process.env.PRODUCTION_URL;
    }
    // Fallback for common deployment platforms
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    if (process.env.NETLIFY_URL) {
      return process.env.NETLIFY_URL;
    }
  }

  // Development environment - Replit specific
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }

  // Legacy Replit domains
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  }

  // Fallback to localhost for local development
  return "http://localhost:5000";
}

export function getDashboardUrl(projectId?: number): string {
  const baseUrl = getAppBaseUrl();
  if (projectId) {
    return `${baseUrl}/dashboard?project=${projectId}`;
  }
  return `${baseUrl}/dashboard`;
}

export function getProjectUrl(projectId: number): string {
  return `${getAppBaseUrl()}/dashboard?project=${projectId}`;
}