declare module "http" {
  interface IncomingMessage {
    params?: Record<string, string>;
    body?: any;
    query?: Record<string, string>;
  }
}
