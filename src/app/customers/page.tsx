import type { Metadata } from "next";
import View from "@/views/Customers";

export const metadata: Metadata = { title: "Customers, Fedpump CRM demo" };

export default function Page() {
  return <View />;
}
