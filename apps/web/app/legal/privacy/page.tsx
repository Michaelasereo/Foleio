export const metadata = {
  title: 'Privacy Policy · Foleio',
  description: 'Privacy Policy for the Foleio platform - NDPA 2023 compliant.',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="mb-2 text-4xl font-medium tracking-tight text-foreground">
        Privacy Policy
      </h1>
      <p className="text-muted-foreground text-sm mb-10">
        Effective Date: March 2026 · Compliant with the Nigeria Data Protection
        Act (NDPA) 2023
      </p>
      <div className="legal-content">
        <p>
          At Foleio, we take your privacy seriously. This Privacy Policy explains
          how we collect, use, store, and protect your personal data when you
          use the Foleio platform. It is written in compliance with the Nigeria
          Data Protection Act, 2023 (NDPA) and applies to all users of Foleio,
          including creators, fans, and customers.
        </p>
        <p>
          By using Foleio, you consent to the practices described in this Policy.
        </p>

        <h2>1. Who We Are (Data Controller)</h2>
        <p>
          Foleio is the data controller responsible for your personal data. We
          determine the purposes and means of processing your data.
        </p>
        <p>Contact: legal@foleio.com</p>
        <p>
          [Insert full registered business name and address once CAC
          registration is complete]
        </p>

        <h2>2. Data We Collect</h2>
        <p>
          <strong>Information you provide directly:</strong>
        </p>
        <ul>
          <li>Account registration: full name, email address, phone number</li>
          <li>
            Creator onboarding: business name, bank account details, social media
            handles
          </li>
          <li>
            Booking forms: customer name, email, phone number, address, booking
            notes
          </li>
          <li>
            Payment: payment card details (processed and stored securely by
            Paystack - Foleio does not store card data)
          </li>
          <li>
            Content uploads: video files, images, PDFs, and associated metadata
          </li>
          <li>Communications: messages sent to our support team</li>
        </ul>
        <p>
          <strong>Information we collect automatically:</strong>
        </p>
        <ul>
          <li>
            Usage data: pages visited, features used, content viewed, time spent
            on Platform
          </li>
          <li>
            Device data: IP address, browser type, operating system, device
            identifiers
          </li>
          <li>
            Transaction data: payment references, amounts, transaction timestamps
          </li>
          <li>Cookies and similar tracking technologies (see Section 8)</li>
        </ul>
        <p>
          <strong>Information from third parties:</strong>
        </p>
        <ul>
          <li>
            Paystack: payment verification status, transaction references,
            subscription status
          </li>
          <li>Mux / Cloudflare: video upload and streaming metadata</li>
          <li>Supabase: authentication session data</li>
        </ul>

        <h2>3. How We Use Your Data</h2>
        <ul>
          <li>
            To create and manage your account - Legal basis: Contract performance
          </li>
          <li>
            To process payments and manage payouts - Legal basis: Contract
            performance
          </li>
          <li>
            To deliver content, bookings, and subscriptions you have purchased -
            Legal basis: Contract performance
          </li>
          <li>
            To send transactional emails (booking confirmations, purchase
            receipts, payout notifications) - Legal basis: Contract performance
          </li>
          <li>
            To send platform updates and product announcements - Legal basis:
            Legitimate interest (you may opt out at any time)
          </li>
          <li>
            To prevent fraud, abuse, and ensure platform security - Legal basis:
            Legitimate interest
          </li>
          <li>
            To comply with legal obligations under Nigerian law - Legal basis:
            Legal obligation
          </li>
          <li>
            To improve our Platform through aggregated, anonymised analytics -
            Legal basis: Legitimate interest
          </li>
        </ul>

        <h2>4. How We Share Your Data</h2>
        <p>
          We do not sell your personal data. We share data only in the following
          circumstances:
        </p>
        <p>
          <strong>Service Providers:</strong> We share data with trusted
          third-party providers who process data on our behalf, including
          Paystack (payments), Mux (video hosting), Cloudflare (storage and CDN),
          Supabase (auth and database), Resend (email delivery), and Sentry
          (error monitoring). All providers are contractually bound to process
          data only as instructed by Foleio.
        </p>
        <p>
          <strong>Between Creators and Fans:</strong> Certain information is
          necessarily shared - for example, a creator can see the name, email,
          and phone number of customers who book their services. By using the
          Platform, you consent to this limited sharing as necessary to deliver
          the services you have requested.
        </p>
        <p>
          <strong>Legal Requirements:</strong> We may disclose your data where
          required by law, court order, or government authority, including the
          Nigeria Data Protection Commission (NDPC).
        </p>
        <p>
          <strong>Business Transfers:</strong> In the event of a merger or
          acquisition, your data may be transferred as part of that transaction.
          We will notify you before your data is transferred.
        </p>

        <h2>5. Data Retention</h2>
        <ul>
          <li>
            Account data: retained for the duration of your account and 2 years
            after closure
          </li>
          <li>
            Transaction and payment records: retained for 6 years (Nigerian
            financial regulations)
          </li>
          <li>
            Content uploads: retained until you delete them or close your account
          </li>
          <li>Booking records: retained for 3 years after the booking date</li>
          <li>Support communications: retained for 2 years</li>
        </ul>
        <p>After these periods, data is securely deleted or anonymised.</p>

        <h2>6. Your Rights Under the NDPA 2023</h2>
        <ul>
          <li>
            <strong>Right to access:</strong> Request a copy of the personal data
            we hold about you.
          </li>
          <li>
            <strong>Right to rectification:</strong> Request correction of
            inaccurate or incomplete data.
          </li>
          <li>
            <strong>Right to erasure:</strong> Request deletion of your personal
            data, subject to our legal retention obligations.
          </li>
          <li>
            <strong>Right to restriction:</strong> Request that we limit how we
            process your data in certain circumstances.
          </li>
          <li>
            <strong>Right to data portability:</strong> Request a copy of your
            data in a structured, machine-readable format.
          </li>
          <li>
            <strong>Right to object:</strong> Object to processing based on
            legitimate interest at any time.
          </li>
          <li>
            <strong>Right to withdraw consent:</strong> Where processing is based
            on consent, you may withdraw it at any time.
          </li>
        </ul>
        <p>
          To exercise any of these rights, contact us at legal@foleio.com. We
          will respond within 30 days.
        </p>

        <h2>7. Data Security</h2>
        <p>
          We implement appropriate technical and organisational measures to
          protect your personal data, including encryption of data in transit
          (HTTPS/TLS) and at rest, access controls, regular security assessments,
          and secure third-party infrastructure. In the event of a data breach
          that poses a risk to your rights, we will notify the NDPC within 72
          hours and affected users without undue delay, as required by the NDPA
          2023.
        </p>

        <h2>8. Cookies &amp; Tracking</h2>
        <p>
          Foleio uses cookies to maintain your session and authentication state
          (essential), remember your preferences (functional - with your
          consent), and analyse Platform usage through anonymised analytics (with
          your consent). You can manage your cookie preferences at any time
          through our cookie banner or by contacting us.
        </p>

        <h2>9. Children&apos;s Privacy</h2>
        <p>
          Foleio is not directed at children under the age of 18. We do not
          knowingly collect personal data from minors. If we become aware that a
          child under 18 has provided us with personal data, we will delete such
          data promptly. Contact us at legal@foleio.com if you believe a minor
          has provided us with data.
        </p>

        <h2>10. Cross-Border Data Transfers</h2>
        <p>
          Some of our service providers (including Cloudflare, Mux, and Supabase)
          may process or store data outside Nigeria. Where we transfer data
          internationally, we ensure appropriate safeguards are in place in
          accordance with Section 42 of the NDPA 2023. We will not transfer your
          data to countries without adequate data protection laws without your
          explicit consent.
        </p>

        <h2>11. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you
          of material changes by email and by posting a notice on the Platform.
          Your continued use of the Platform after the effective date constitutes
          acceptance of the updated Policy.
        </p>

        <h2>12. Contact &amp; Complaints</h2>
        <p>Email: legal@foleio.com</p>
        <p>Website: www.foleio.com</p>
        <p>[Insert full address once CAC registration is complete]</p>
        <p>
          If you are not satisfied with our response, you have the right to lodge
          a complaint with the Nigeria Data Protection Commission (NDPC) at
          ndpc.gov.ng.
        </p>
      </div>
    </div>
  );
}
