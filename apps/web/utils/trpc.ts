import type { AppRouter } from "@repo/api/src";
import { createWSClient, httpBatchLink, splitLink, wsLink } from "@trpc/client";
import { createTRPCNext } from "@trpc/next";

const urlEnd = 'localhost:4000/trpc';
const wsClient = createWSClient({ url: `ws://${urlEnd}` });

export const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      links: [
        splitLink({
          condition(op) {
            return op.type === 'subscription';
          },
          true: wsLink({ client: wsClient }),
          false: httpBatchLink({
            url: `http://${urlEnd}`,
          }),
        }),
      ],
      /**
       * @link https://tanstack.com/query/v4/docs/reference/QueryClient
       **/
      queryClientConfig: {
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
          },
        },
      },
    };
  },
  /**
   * @link https://trpc.io/docs/ssr
   **/
  ssr: false,
});
