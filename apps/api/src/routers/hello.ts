import { publicProcedure, router } from "@/trpc.js";

export const helloRouter = router({
  world: publicProcedure.query(async () => {
    return "Hello World from the user router!";
  }),
});
