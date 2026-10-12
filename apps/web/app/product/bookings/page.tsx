import type { Metadata } from 'next';
import { BookingsPreview } from '@/components/site/BookingsPreview';
import { ProductStory } from '@/components/site/ProductStory';
import { SiteChrome } from '@/components/site/SiteChrome';
import { Italic } from '@/components/landing/ui';

const description =
  'Publish your services, open the days you work, and take a deposit or the full amount online. Your client gets a reminder before the balance is due.';

export const metadata: Metadata = {
  title: 'Bookings that confirm themselves | Foleio',
  description,
  openGraph: {
    title: 'Bookings that confirm themselves | Foleio',
    description,
    url: 'https://foleio.com/product/bookings',
    siteName: 'Foleio',
    type: 'website',
  },
  alternates: { canonical: 'https://foleio.com/product/bookings' },
};

export const dynamic = 'force-static';

export default function ProductBookingsPage() {
  return (
    <SiteChrome active="/product/bookings">
      <ProductStory
        eyebrow="Bookings"
        title={
          <>
            Bookings that <Italic>confirm themselves.</Italic>
          </>
        }
        lede="Publish your services, open the days you work, and take a deposit or the full amount online. Your client gets a reminder before the balance is due."
        stepsTitle={
          <>
            Get booked <Italic>and paid.</Italic>
          </>
        }
        steps={[
          {
            title: 'Services and availability',
            body: 'List what you offer and when you are free, so clients book without the back-and-forth in your DMs.',
          },
          {
            title: 'Deposits and balances',
            body: 'Take a deposit or the full amount for each service. The balance is due before the date, seven days by default.',
          },
          {
            title: 'Your policy, seen first',
            body: 'Clients read your booking policy before they pay, so a cancellation is never a surprise.',
          },
        ]}
        compareTitle={
          <>
            What is on Free, <Italic>and what Pro adds.</Italic>
          </>
        }
        compareLede="Free is ₦0 a month. Pro is ₦3,000 a month or ₦7,500 a quarter, with a lower fee on every payment."
        rows={[
          {
            title: 'Services',
            body: 'Up to 10 on Free, unlimited on Pro. Each has its own price, duration, and add-ons.',
            free: 'Free · more on Pro',
          },
          {
            title: 'Availability',
            body: 'Open the days and hours you work. Clients pick a free slot.',
            free: 'Free',
          },
          {
            title: 'Deposits and balances',
            body: 'A deposit or full payment for each service, with the balance tracked for you.',
            free: 'Free',
          },
          {
            title: 'Email reminders',
            body: 'Your client is reminded two days before the balance is due, on the day, and if it is overdue.',
            free: 'Free',
          },
          {
            title: 'Booking policy',
            body: 'Upload a PDF or link a Google Doc.',
            free: 'Free',
          },
          {
            title: 'Custom quotes',
            body: 'Send a quote link for custom work. Your client pays from the link.',
            free: 'Free',
          },
          {
            title: 'Schedule templates',
            body: 'Save your usual hours and reuse them.',
            free: 'Pro',
            pro: true,
          },
        ]}
        closeTitle={
          <>
            Start taking <Italic>bookings.</Italic>
          </>
        }
        closeLede="Add your services, set your calendar, and share your link."
        preview={<BookingsPreview />}
      />
    </SiteChrome>
  );
}
