import type { Metadata } from "next";
import View from "@/views/Reports";

export const metadata: Metadata = { title: "Reports, Fedpump CRM demo" };

export default function Page() {
  return <View />;
}
