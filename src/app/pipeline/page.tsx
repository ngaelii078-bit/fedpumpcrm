import type { Metadata } from "next";
import View from "@/views/Pipeline";

export const metadata: Metadata = { title: "Pipeline, Rebotech CRM demo" };

export default function Page() {
  return <View />;
}
