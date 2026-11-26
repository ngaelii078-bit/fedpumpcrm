import type { Metadata } from "next";
import View from "@/views/Schedule";

export const metadata: Metadata = { title: "Schedule, Rebotech CRM demo" };

export default function Page() {
  return <View />;
}
