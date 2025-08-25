import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Черга YouTube відео - Панель управління",
  description: "Перегляд та керування чергою YouTube відео",
};

export default function QueueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
