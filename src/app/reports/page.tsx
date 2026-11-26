import type { Metadata } from "next";
import View from "@/views/Reports";

export const metadata: Metadata = { title: "Reports, LexBridge CRM demo" };

export default function Page() {
  return <View />;
}
