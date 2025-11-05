import { Toaster } from "@/components/ui/sonner";
import type { AppProps } from "next/app";
import { trpc } from "../utils/trpc";
import "./globals.css";

function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Toaster position="top-center" />
    </>
  );
}

export default trpc.withTRPC(App);
