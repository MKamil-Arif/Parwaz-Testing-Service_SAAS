import { AnnouncementBar } from "@/components/site/announcement-bar";
import { Footer } from "@/components/site/footer";
import { Navbar } from "@/components/site/navbar";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
