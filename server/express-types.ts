// Simple type definitions that work in all TypeScript environments
export type AppRequest = any & {
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
  file?: any;
  params: any;
  query: any;
  body: any;
  headers: any;
  method: string;
  path: string;
  protocol: string;
  get: (header: string) => string;
};

export type AppResponse = any & {
  status: (code: number) => AppResponse;
  json: (data: any) => AppResponse;
  send: (data: any) => AppResponse;
  set: (header: string, value: string) => AppResponse;
};

export type AppNextFunction = any;