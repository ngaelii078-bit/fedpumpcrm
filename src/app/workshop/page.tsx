import type { Metadata } from "next";
import View from "@/views/Workshop";

export const metadata: Metadata = { title: "Workshop, Fedpump CRM demo" };

export default function Page() {
  return <View />;
}
