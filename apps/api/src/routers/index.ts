import { csvRouter } from "@/routers/csv.js";
import { helloRouter } from "@/routers/hello.js";
import { router } from "@/trpc.js";

export const appRouter = router({
  hello: helloRouter,
  csv: csvRouter,
});


export type AppRouter = typeof appRouter;