import { csvRouter } from "@/routers/csv.js";
import { router } from "@/trpc.js";

export const appRouter = router({
  csv: csvRouter,
});


export type AppRouter = typeof appRouter;