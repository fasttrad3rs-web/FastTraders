import { AnnouncementBar, FloatingWhatsApp, Footer, Header, ScrollToTop } from '@/components/layout';
import { MobileActionBar } from '@/components/layout/mobile-action-bar';
import { getSettings } from '@/lib/api/catalog';

/**
 * Storefront chrome.
 *
 * Split out of the root layout so `/admin` can render its own shell without
 * inheriting the public header, footer and WhatsApp bubble.
 */
export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  // Announcement copy is editable in the admin panel.
  const settings = await getSettings();
  const announcement = settings?.announcement;

  return (
    <>
      {announcement?.isActive ? (
        <AnnouncementBar text={announcement.text} link={announcement.link} />
      ) : null}

      <Header />

      {/* Clears the sticky mobile action bar (h-16 plus the safe-area inset). */}
      <main id="main" className="pb-20 lg:pb-0">
        {children}
      </main>

      <Footer />

      <FloatingWhatsApp />
      <ScrollToTop />
      <MobileActionBar />
    </>
  );
}
