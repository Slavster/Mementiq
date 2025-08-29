import { useEffect } from "react";

export default function PrivacyPolicyPage() {
  useEffect(() => {
    document.title = "Privacy Policy | Mementiq";
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="container mx-auto px-4 py-6">
          <a
            href="/"
            className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
          >
            ← Back to Mementiq
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-bold text-white mb-8">PRIVACY POLICY</h1>
          <p className="text-zinc-400 mb-8">Effective Date: August 29, 2025</p>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              WHO WE ARE
            </h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              This Privacy Policy explains how Seraph Ventures LLC, dba Mementiq
              ("Company," "we," "us," or "our") collects, uses, shares, and
              safeguards information when you visit our website, create an
              account, or use our private video editing services (the
              "Services"). We are a US limited liability company registered in
              the state of New Mexico.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              ROLE-BASED DISCLOSURE
            </h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              For most Website & Account Data, we act as an independent
              controller/business. For Client Content (raw footage, project
              files, and related metadata you upload for editing), we act as
              your processor/service provider and handle it solely under your
              instructions and our agreement. For participants in the Research,
              Development, and Curated Dataset Program, we act as an independent
              controller/business for those improvement uses.
            </p>
            <p className="text-zinc-300 leading-relaxed mb-4">
              We do not publicly host or publish client videos; content is
              processed privately and returned to you.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">SCOPE</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              The Services are intended for adults (18+) only.
            </p>
            <p className="text-zinc-300 leading-relaxed mb-4">
              This Policy applies to our website(s), web applications, and any
              offline activities that reference it. It does not apply to
              third-party websites or services you access through links from our
              site, or to your own publication of videos on third-party
              platforms.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              SUMMARY/ AT A GLANCE
            </h2>
            <ul className="space-y-3 text-zinc-300">
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <span>
                  <strong>18+ only:</strong> We serve adults; we do not permit
                  minors to use the Services.
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <span>
                  <strong>Your uploads are private:</strong> Only necessary
                  staff/contractors see them for editing.
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <span>
                  <strong>Two optional opt-ins:</strong> (1) Showing select
                  finished work in our portfolio; (2) Model training/curated
                  dataset program. Both are off by default, and you can withdraw
                  any time.
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <span>
                  <strong>No ad-tech sale:</strong> By default, we do not sell
                  personal information or share it for cross-context behavioral
                  advertising. If you opt into the dataset program, curated,
                  de-identified datasets may be licensed/sold under strict
                  terms. We honor Global Privacy Control (GPC) signals and
                  provide Your Privacy Choices.
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <span>
                  <strong>Cookies:</strong> We use only essential cookies
                  necessary to operate the site.
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <span>
                  <strong>Security:</strong> We use appropriate measures and
                  reputable service providers; if legally required, we'll notify
                  you of a data breach.
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <span>
                  <strong>Your rights:</strong> Access, delete, correct,
                  portability, objection/restriction (where applicable), and
                  choices for sale/share and the optional programs.
                </span>
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              1. INFORMATION WE COLLECT
            </h2>
            <div className="space-y-4 text-zinc-300">
              <div>
                <h3 className="font-semibold text-white mb-2">
                  A. Account & Contact Information:
                </h3>
                <p>
                  Name, email, company name (optional), authentication
                  identifiers, IP address, support correspondence, and
                  preferences.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">
                  B. Client Content:
                </h3>
                <p>
                  Raw footage, project files, audio tracks, stills, edits,
                  captions, embedded metadata, and your editing instructions. Do
                  not upload illegal content or content you lack rights to.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">
                  C. Transaction & Payment Information:
                </h3>
                <p>
                  Order details, plan tier, invoices, tax information. Payment
                  card data is processed by our payment processor; we do not
                  store full card numbers.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">
                  D. Device/Usage Data (Logs & Cookies):
                </h3>
                <p>
                  IP address, device identifiers, browser type, session
                  activity, timestamps, error logs, and approximate location.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">
                  E. Contractor/Partner Information (for independent
                  editors/vendors):
                </h3>
                <p>
                  Contact details, contractual/compliance data, limited
                  device/usage telemetry when accessing our systems.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">
                  F. Inferences (Minimal):
                </h3>
                <p>
                  Limited inferences drawn from usage to improve workflow and
                  quality (e.g., feature adoption).
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">
                  G. Biometric/Sensitive Data:
                </h3>
                <p>
                  We do not create or store biometric identifiers (e.g., face or
                  voice prints) and we do not use Client Content for identity
                  recognition. If we later offer features that require such
                  processing, we will provide separate notice and obtain any
                  required consent.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              2. HOW WE USE INFORMATION (PURPOSES)
            </h2>
            <p className="text-zinc-300 mb-4">We use information to:</p>
            <div className="space-y-3 text-zinc-300 ml-4">
              <div>
                <span className="font-semibold">1. Provide the Services:</span>{" "}
                Account creation, file intake, editing, delivery, support, and
                quality assurance.
              </div>
              <div>
                <span className="font-semibold">2. Process Client Content</span>{" "}
                as your processor/service provider according to your
                instructions and our agreement.
              </div>
              <div>
                <span className="font-semibold">
                  3. Security & Abuse Prevention:
                </span>{" "}
                Authenticate users; detect, investigate, and prevent malicious,
                fraudulent, or illegal activity; enforce our terms.
              </div>
              <div>
                <span className="font-semibold">4. Legal Compliance:</span>{" "}
                Comply with applicable laws (including mandatory CSAM reporting
                to NCMEC), respond to lawful requests, and meet tax/accounting
                obligations.
              </div>
              <div>
                <span className="font-semibold">
                  5. Analytics & Improvements:
                </span>{" "}
                Measure performance, fix bugs, optimize workflows, and develop
                new features. When feasible, we use de-identified or aggregated
                data.
              </div>
              <div>
                <span className="font-semibold">6. Communications:</span> Send
                service messages, transactional emails, and—with your consent or
                as permitted—product updates.
              </div>
            </div>
            <p className="text-zinc-400 mt-4 text-sm">
              (EEA/UK lawful bases, where applicable: contract performance;
              legitimate interests such as security/service improvement; consent
              for optional programs; legal obligation; vital interests for
              safety.)
            </p>
            <p className="text-zinc-300 mt-4">
              <span className="font-semibold">Automated decisions:</span> We do
              not make automated decisions that produce legal or similarly
              significant effects about you. If that changes, we will provide
              required notices and choices.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              3. HOW WE SHARE INFORMATION
            </h2>
            <p className="text-zinc-300 mb-4">
              We share information only as needed and with safeguards:
            </p>
            <ul className="space-y-3 text-zinc-300">
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">
                    Service Providers/Subprocessors:
                  </span>{" "}
                  Hosting/storage, payment processing, email delivery,
                  analytics, project management, error monitoring—acting under
                  contract and our instructions. A current list of our data
                  subprocessors is available on request at
                  mementiq@seraphventures.net.
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">
                    Independent Contractor Editors:
                  </span>{" "}
                  Under confidentiality, security, and data-handling
                  obligations; edit files solely to perform your project.
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">Legal & Safety:</span> To
                  comply with laws and valid legal process (e.g., subpoenas,
                  court orders) and to protect rights, safety, and property.
                  Where permitted by law, we will notify affected users before
                  disclosing their information. This includes mandatory
                  reporting of CSAM to NCMEC and cooperation with law
                  enforcement.
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">Business Transfers:</span> In
                  connection with mergers, acquisitions, financings, or asset
                  transfers, with continued protection or notice/choices.
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">
                    Aggregated/De-identified Data:
                  </span>{" "}
                  That cannot reasonably be used to identify you.
                </div>
              </li>
            </ul>
            <div className="mt-6 p-4 bg-zinc-900 rounded-lg">
              <h3 className="font-semibold text-white mb-2">Sale/Sharing:</h3>
              <p className="text-zinc-300">
                By default, we do not sell personal information or share it for
                cross-context behavioral advertising. If you opt in to our
                Research, Development, and Curated Dataset Program (§8B), we may
                license or sell curated, de-identified datasets to trusted
                partners under strict terms. We honor Global Privacy Control
                (GPC) signals for sale/share choices. Manage your choices at
                Your Privacy Choices. We do not sell for cross-context
                behavioral advertising.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              4. INTERNATIONAL TRANSFERS
            </h2>
            <p className="text-zinc-300 leading-relaxed">
              We are U.S.-based and may process information in the U.S. and
              other countries where our contractors or service providers
              operate. Where required, we use lawful transfer mechanisms (e.g.,
              EU Standard Contractual Clauses and UK addenda) and appropriate
              safeguards.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              5. RETENTION
            </h2>
            <p className="text-zinc-300 mb-4">
              We retain information only as long as necessary for the purposes
              above or as required by law:
            </p>
            <ul className="space-y-3 text-zinc-300">
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">Client Content:</span>{" "}
                  Retained for active projects. If you do not opt in to the
                  Research, Development, and Curated Dataset Program, we delete
                  Client Content within 90 days of final delivery. If you opt in
                  (§8B), we may retain copies in R&D corpora and/or curated
                  datasets until you withdraw consent or until our R&D program
                  ends; existing model parameters may not be reversible.
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">
                    Training Corpora (if opted in):
                  </span>{" "}
                  Retained no longer than 5 years from collection (or until you
                  withdraw, whichever is sooner), unless a longer period is
                  required by law or to protect the security or integrity of the
                  Services.
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">
                    Account & Billing Records:
                  </span>{" "}
                  6–7 years or as required for tax/audit.
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">Logs/Telemetry:</span> 90–180
                  days, unless needed longer for security/troubleshooting.
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">Legal Holds:</span> We may
                  preserve specific data beyond standard periods if required by
                  law/investigations.
                </div>
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              6. SECURITY
            </h2>
            <p className="text-zinc-300 leading-relaxed">
              We use appropriate technical and organizational measures to
              protect personal information and engage service providers under
              contract to process data on our behalf. No method of transmission
              or storage is completely secure. Where required by law, we will
              notify you of a data breach.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              7. CONTENT SAFETY & ILLEGAL MATERIAL
            </h2>
            <ul className="space-y-3 text-zinc-300">
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">Prohibited Content:</span> Do
                  not upload illegal content or content you lack rights to
                  (e.g., CSAM, non-consensual intimate imagery, infringing
                  media, extreme animal cruelty, etc).
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">Mandatory Reporting:</span> If
                  we become aware of apparent CSAM, we will report to NCMEC and
                  may preserve/disclose information to law enforcement.
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">Takedown & Cooperation:</span>{" "}
                  We may remove content, suspend/terminate accounts, and
                  cooperate with investigations.
                </div>
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              8. SHOWING SELECT WORK (OPT-IN)
            </h2>
            <p className="text-zinc-300 mb-4">
              With your permission, we may include final Edited Outputs (never
              raw uploads) in a small selection of showcase materials—our
              website, social channels, case studies, award entries, or
              new-client pitches.
            </p>
            <ul className="space-y-3 text-zinc-300">
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">Your choice:</span> Off by
                  default; requires your clear opt-in at checkout/upload.
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">How we present it:</span> We
                  may make light, non-substantive formatting adjustments (e.g.,
                  resizing, compression, tasteful watermarks) for display—no
                  creative changes.
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">People on camera:</span> By
                  opting in, you agree that any names/likenesses appearing in
                  the Edited Output may be shown for the limited showcase
                  purpose. You also confirm you have permission from other
                  identifiable people featured. Where needed, we can apply
                  redactions or seek additional releases.
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">Change your mind:</span> Email
                  mementiq@seraphventures.net; we'll stop future uses and remove
                  the piece from active showcases within a reasonable window (no
                  recall of printed materials or past award submissions).
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">Editors' portfolios:</span>{" "}
                  Editors do not publish portfolio pieces by default; any
                  separate editor display would require your written approval.
                </div>
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              9. RESEARCH, DEVELOPMENT, AND CURATED DATASET PROGRAM (OPT-IN)
            </h2>
            <p className="text-zinc-300 mb-4">
              With your permission, we may use Client Content and/or Edited
              Outputs to help train, fine-tune, evaluate, and improve our
              editing systems (e.g., teaching systems to better recognize cuts,
              pacing, color balance, common edit structures, etc). In limited
              cases, we may make curated, de-identified datasets available to
              trusted research partners for similar improvement purposes under
              strict agreements, which may include licensing or sale of such
              datasets.
            </p>
            <ul className="space-y-3 text-zinc-300">
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">Eligibility:</span> Available
                  only to users 18+.
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">Your choice:</span> Off by
                  default; requires a separate, explicit opt-in. If you don't
                  opt in, your content is not used for these purposes.
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">How we protect it:</span>{" "}
                  Dataset governance (access controls, minimization, audit logs,
                  and—where feasible—de-identification/pseudonymization). We
                  publicly commit not to re-identify de-identified data and
                  require recipients to do the same. We do not use illegal
                  content and cooperate with law enforcement where required.
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">Third parties:</span>{" "}
                  Infrastructure vendors act as service providers. Where we
                  collaborate or make curated datasets available (including
                  licensed or sold datasets), recipients are bound by agreements
                  limiting use to model development/evaluation, prohibiting
                  re-identification, advertising uses, or onward resale, and
                  requiring appropriate security.
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">Control & timing:</span> You
                  can withdraw at any time; we'll stop future use and remove
                  your content from corpora going forward. Existing learned
                  model parameters may not be reversible. We will not newly
                  share datasets including your content after withdrawal and
                  will request deletion from prior recipients under our
                  agreements, where feasible.
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">Advertising:</span> We do not
                  use your content for cross-context behavioral advertising.
                </div>
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              10. COOKIES & TRACKING
            </h2>
            <p className="text-zinc-300 leading-relaxed">
              We use only essential cookies that are necessary to operate the
              site and keep you signed in. We do not use analytics, advertising,
              or other non-essential cookies. If this changes, we will update
              this Policy and (where required) present a consent banner and
              provide controls to manage non-essential cookies.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              11. YOUR PRIVACY RIGHTS
            </h2>
            <p className="text-zinc-300 mb-4">
              Depending on your location, you may have some or all of the
              following rights:
            </p>
            <ul className="space-y-3 text-zinc-300">
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">Access/Know</span> the
                  categories and specific pieces of personal information we
                  hold.
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">Correction</span> of
                  inaccurate information.
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">Deletion/Erasure</span> of
                  certain information.
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">Portability</span> of certain
                  information in a usable format.
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">
                    Restriction/Objection (EEA/UK)
                  </span>{" "}
                  to certain processing based on legitimate interests.
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">Opt-out</span> of targeted
                  advertising or certain profiling (where applicable), and
                  opt-out of sale/sharing and AI training/dataset use (where
                  applicable).
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <div>
                  <span className="font-semibold">Withdraw consent</span> where
                  processing is based on consent (e.g., showcases or model
                  training program).
                </div>
              </li>
            </ul>
            <div className="mt-6 p-4 bg-zinc-900 rounded-lg">
              <h3 className="font-semibold text-white mb-2">
                Exercising your rights:
              </h3>
              <p className="text-zinc-300">
                Email{" "}
                <a
                  href="mailto:mementiq@seraphventures.net"
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  mementiq@seraphventures.net
                </a>{" "}
                or visit Your Privacy Choices. We honor Global Privacy Control
                (GPC) signals for applicable sale/share choices. We will verify
                your identity and respond within required timeframes. If we deny
                your request, you may appeal by replying to our decision; you
                also have the right to contact your local data protection
                authority. We will not discriminate against you for exercising
                your rights.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              12. CHILDREN'S PRIVACY
            </h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              The Services are intended for adults (18+) only. We do not
              knowingly collect information from or allow use by anyone under
              18. If we learn that an account is associated with a minor, we
              will disable the account and remove related data except where we
              are legally required to preserve specific information (e.g., for
              safety investigations or to comply with law). Please contact{" "}
              <a
                href="mailto:mementiq@seraphventures.net"
                className="text-cyan-400 hover:text-cyan-300"
              >
                mementiq@seraphventures.net
              </a>{" "}
              if you believe a minor has used the Services.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              13. CHANGES TO THIS POLICY
            </h2>
            <p className="text-zinc-300 leading-relaxed">
              We may update this Policy to reflect operational, legal, or
              regulatory changes. Updates will be posted here with a new
              Effective Date. Material changes will be communicated via the
              Service or email when appropriate.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              14. GOVERNING LAW & VENUE
            </h2>
            <p className="text-zinc-300 leading-relaxed">
              This Policy—and any dispute or claim relating to it or to our
              privacy practices—is governed by the laws of the State of New
              Mexico, USA, without regard to conflict-of-law rules. Courts of
              competent jurisdiction located in Bernalillo County, New Mexico
              (state or federal) shall have exclusive jurisdiction and venue.
              Nothing here limits any non-waivable consumer or data protection
              rights that apply to you under the laws of your place of
              residence.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              15. CONTACT US
            </h2>
            <div className="text-zinc-300 space-y-2">
              <p>Seraph Ventures LLC, dba Mementiq</p>
              <p>Attn: Privacy</p>
              <p>1209 MOUNTAIN ROAD PL NE STE N</p>
              <p>ALBUQUERQUE, NM 87110 USA</p>
              <p>
                Email:{" "}
                <a
                  href="mailto:mementiq@seraphventures.net"
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  mementiq@seraphventures.net
                </a>
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              APPENDIX A — U.S. STATE PRIVACY NOTICE (CA/CO/CT/VA/UT & OTHERS)
            </h2>
            <div className="space-y-4 text-zinc-300">
              <p>
                <span className="font-semibold">Categories collected:</span>{" "}
                Identifiers (name, email, IP), commercial information (orders),
                internet/electronic activity (logs), geolocation (approximate),
                professional information (for editors), and limited inferences.
                Sensitive personal information is generally not sought; do not
                upload sensitive data unless necessary.
              </p>
              <p>
                <span className="font-semibold">Sources:</span> Directly from
                you; automated collection from your device; service providers.
              </p>
              <p>
                <span className="font-semibold">Purposes:</span> As described
                above in How We Use Information.
              </p>
              <p>
                <span className="font-semibold">Disclosures:</span> To service
                providers/subprocessors; to independent editors under
                confidentiality; to authorities for legal compliance; to
                affiliates/successors in business transfers.
              </p>
              <p>
                <span className="font-semibold">Sales/Sharing:</span> We do not
                sell or share your personal information by default. If you opt
                in to our Research, Development, and Curated Dataset Program, we
                may make curated, de-identified datasets available to trusted
                partners under strict agreements (treated as a sale/share under
                some state laws). Manage choices at Your Privacy Choices. We
                honor GPC signals for applicable sale/share choices.
              </p>
              <p>
                <span className="font-semibold">
                  Your rights (state-specific):
                </span>{" "}
                Access/know, deletion, correction, portability, opt-out of
                sale/sharing and targeted advertising (where applicable), and
                appeal. Submit requests via{" "}
                <a
                  href="mailto:mementiq@seraphventures.net"
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  mementiq@seraphventures.net
                </a>{" "}
                or Your Privacy Choices. We will verify requests and respond
                within statutory timelines.
              </p>
              <p>
                <span className="font-semibold">
                  Notice at Collection (CA):
                </span>{" "}
                We collect the categories listed above for the purposes
                described; retention periods are in Retention. For users who opt
                into the Research, Development, and Curated Dataset Program,
                such use may be considered a sale/share; you can withdraw at any
                time and via GPC; see Your Privacy Choices.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              APPENDIX B — EEA/UK ADDENDUM (IF APPLICABLE)
            </h2>
            <div className="space-y-4 text-zinc-300">
              <p>
                <span className="font-semibold">Controller:</span> For Website &
                Account Data: Seraph Ventures LLC, dba Mementiq.
              </p>
              <p>
                <span className="font-semibold">Processor:</span> For Client
                Content: we act on your instructions under our Terms/DPA.
              </p>
              <p>
                <span className="font-semibold">Lawful Bases:</span> Contract
                performance; legitimate interests (security, improvement, fraud
                prevention); consent (opt-in programs/cookies where used); legal
                obligation; vital interests (e.g., reporting exploitation of
                minors).
              </p>
              <p>
                <span className="font-semibold">International Transfers:</span>{" "}
                We rely on SCCs and equivalent mechanisms for transfers outside
                your region and implement appropriate safeguards.
              </p>
              <p>
                <span className="font-semibold">Your Rights:</span> Access,
                rectification, erasure, restriction, portability, objection, and
                complaint to your supervisory authority. Where processing is
                based on consent, you may withdraw consent at any time.
              </p>
              <p>
                <span className="font-semibold">Automated Decisions:</span> We
                do not make automated decisions that produce legal or similarly
                significant effects. If that changes, we will provide notices
                and choices.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              DEFINITIONS (SELECTED)
            </h2>
            <div className="space-y-2 text-zinc-300">
              <p>
                <span className="font-semibold">"Client Content":</span> Files
                and related data you upload for private editing.
              </p>
              <p>
                <span className="font-semibold">
                  "Personal Information/Personal Data":
                </span>{" "}
                Information that identifies or can reasonably be linked to an
                individual.
              </p>
              <p>
                <span className="font-semibold">
                  "Processor/Service Provider":
                </span>{" "}
                An entity that processes personal data on behalf of a
                controller/business.
              </p>
              <p>
                <span className="font-semibold">"Sell/Share":</span> As defined
                by applicable law; see Appendix A.
              </p>
            </div>
          </section>

          <div className="text-center text-zinc-400 text-sm mt-12 pt-8 border-t border-zinc-800">
            <p>LAST UPDATED: August 29, 2025</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8">
        <div className="container mx-auto px-4 text-center">
          <a
            href="/"
            className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
          >
            Return to Mementiq
          </a>
        </div>
      </footer>
    </div>
  );
}
