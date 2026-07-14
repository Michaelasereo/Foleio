import Link from 'next/link';

export const metadata = {
  title: 'Data Policy · Foleio',
  description:
    'How Foleio collects, uses, stores, and protects personal data under the Nigeria Data Protection Act (NDPA) 2023.',
};

export default function DataPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="font-display text-4xl font-bold text-foreground mb-2">
        Data Policy
      </h1>
      <p className="text-muted-foreground text-sm mb-10">
        Effective Date: March 2026 · Compliant with the Nigeria Data Protection
        Act (NDPA) 2023
      </p>
      <div className="legal-content">
        <div className="draft-notice">
          ⚠️ DRAFT - This document has not yet been reviewed by a lawyer. It is
          not yet legally binding. Do not publish until reviewed.
        </div>

        <p>
          This Data Policy explains how Foleio collects, uses, stores, shares,
          and protects personal data when you use our platform. It applies to
          creators, fans, customers, and visitors.
        </p>
        <p>
          Foleio is the data controller for personal data processed through the
          Platform. Contact:{' '}
          <a href="mailto:legal@foleio.com">legal@foleio.com</a>.
        </p>

        <h2>1. Data We Collect</h2>
        <p>Depending on how you use Foleio, we may collect:</p>
        <ul>
          <li>
            Account details (name, email, username, password or auth
            credentials)
          </li>
          <li>Profile and business information you choose to publish</li>
          <li>
            Booking, payment, and payout-related details needed to run the
            service
          </li>
          <li>
            Technical data such as device, browser, IP address, and usage logs
          </li>
        </ul>

        <h2>2. How We Use Data</h2>
        <p>We process personal data to:</p>
        <ul>
          <li>Provide, secure, and improve the Platform</li>
          <li>Create and manage accounts and creator profiles</li>
          <li>Process bookings, payments, and related communications</li>
          <li>Meet legal, regulatory, and fraud-prevention obligations</li>
        </ul>

        <h2>3. Sharing</h2>
        <p>
          We share data only when needed to operate Foleio — for example with
          payment processors, hosting providers, and other service partners
          under appropriate safeguards — or when required by law.
        </p>

        <h2>4. Retention &amp; Security</h2>
        <p>
          We keep personal data only as long as needed for the purposes above,
          then delete or anonymize it where practicable. We use technical and
          organizational measures to protect data against unauthorized access,
          loss, or misuse.
        </p>

        <h2>5. Your Rights</h2>
        <p>
          Under the NDPA 2023, you may have rights to access, correct, delete,
          or restrict processing of your personal data, and to object or
          withdraw consent where applicable. Contact{' '}
          <a href="mailto:legal@foleio.com">legal@foleio.com</a> to exercise
          these rights.
        </p>

        <h2>6. Full Privacy Policy</h2>
        <p>
          For the complete statement of our privacy practices, see our{' '}
          <Link href="/legal/privacy">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
