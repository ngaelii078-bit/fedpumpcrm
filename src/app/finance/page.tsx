import type { Metadata } from "next";
import View from "@/views/Finance";

export const metadata: Metadata = { title: "Finance, LexBridge CRM demo" };

export default function Page() {
  return <View />;
}
