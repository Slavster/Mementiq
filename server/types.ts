declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      company?: string;
      verified: boolean;
      claims?: any;
    };
    session?: any;
  }
}