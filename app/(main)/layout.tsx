import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip text-foreground">
      <Navbar />
      <main className="relative flex-1">{children}</main>
      <Footer />
    </div>
  );
}
