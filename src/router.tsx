import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Un seul nouvel essai rapide : en cas de panne, l'occupant voit vite le message d'erreur.
        retry: 1,
        retryDelay: 800,
        // Données réutilisées 30 s : navigation instantanée entre les pages déjà vues.
        staleTime: 30_000,
      },
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
