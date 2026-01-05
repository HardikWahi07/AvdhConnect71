// Type declarations for Deno namespace
declare namespace Deno {
    export interface ServeHandler {
        (request: Request, info: any): Response | Promise<Response>;
    }

    export interface ServeOptions {
        port?: number;
        hostname?: string;
        signal?: AbortSignal;
        onListen?: (params: { hostname: string; port: number }) => void;
        onError?: (error: unknown) => Response | Promise<Response>;
    }

    export function serve(handler: ServeHandler): void;
    export function serve(options: ServeOptions, handler: ServeHandler): void;

    export const env: {
        get(key: string): string | undefined;
        set(key: string, value: string): void;
        delete(key: string): void;
        toObject(): { [key: string]: string };
    };
}
