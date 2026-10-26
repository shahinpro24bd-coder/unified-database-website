import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { recoveryQueryOptions } from "./lib/request-recovery";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: recoveryQueryOptions,
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
