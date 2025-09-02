import { useEffect } from "react";

export default function TermsOfServicePage() {
  useEffect(() => {
    document.title = "Terms of Service | Mementiq";
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
            ← Back to Home
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-bold text-white mb-8">
            TERMS OF SERVICE
          </h1>
          <p className="text-zinc-400 mb-8">
            Effective Date: September 2, 20205
          </p>

          <section className="mb-8">
            <p className="text-zinc-300 leading-relaxed mb-4">
              These Terms of Service (the "Terms") are a legally binding
              agreement between Seraph Ventures LLC dba Mementiq, a New Mexico
              limited liability company ("Company," "we," "us," or "our"), and
              the individual or entity that accesses or uses our private video
              editing services ("Client," "you"). By creating an account,
              placing an order, uploading content, or otherwise using the
              Services, you agree to these Terms. If you do not agree, do not
              use the Services.
            </p>
            <p className="text-zinc-400 leading-relaxed mb-4">
              <strong>Related policies:</strong> Our{" "}
              <a
                href="/privacy-policy"
                className="text-cyan-400 hover:text-cyan-300"
              >
                Privacy Policy
              </a>{" "}
              is incorporated by reference. In case of a conflict between the Terms
              and the{" "}
              <a
                href="/privacy-policy"
                className="text-cyan-400 hover:text-cyan-300"
              >
                Privacy Policy
              </a>{" "}
              about how we handle personal data, the Privacy Policy controls; otherwise, these Terms control.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              1. ELIGIBILITY & ACCOUNT
            </h2>
            <ul className="text-zinc-300 leading-relaxed space-y-4">
              <li>
                <strong>18+ only.</strong> The Services are intended for adults
                (18+). By using the Services, you represent that you are at
                least 18 years old and have the legal capacity to enter into
                these Terms.
              </li>
              <li>
                <strong>Account registration.</strong> You agree to provide
                accurate, current, and complete information and to keep it
                updated. One account per person or entity; you may not
                impersonate others or misrepresent affiliation.
              </li>
              <li>
                <strong>Account security.</strong> You are responsible for
                safeguarding your credentials and for all activity under your
                account. Do not share your password or allow unauthorized use.
                Notify us immediately at{" "}
                <a
                  href="mailto:mementiq@seraphventures.net"
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  mementiq@seraphventures.net
                </a>{" "}
                if you suspect unauthorized access.
              </li>
              <li>
                <strong>Business users.</strong> If you use the Services on
                behalf of a business, you represent that you have authority to
                bind that business, and "you" includes that business.
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              2. THE SERVICES; NON-PUBLIC EDITING MODEL
            </h2>
            <ul className="text-zinc-300 leading-relaxed space-y-4">
              <li>
                <strong>Private editing workflow.</strong> Our Services involve
                private intake of your video assets, assignment to Company
                personnel or independent contractor editors, offline/secure
                editing, and delivery of edited outputs back to you. We do not
                publicly host or publish your videos.
              </li>
              <li>
                <strong>No vetting / no publication control.</strong> We do not
                pre-screen, review, approve, or endorse Client Content before
                editing, and we do not control where you publish finished work.
                You are solely responsible for obtaining all permissions and for
                your downstream publication or distribution decisions. For
                third‑party materials and licensing responsibilities, see §4.3.
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              3. DEFINITIONS
            </h2>
            <ul className="text-zinc-300 leading-relaxed space-y-4">
              <li>
                <strong>"Client Content"</strong> means the footage, audio,
                images, scripts, captions, project files, metadata, and
                instructions you submit.
              </li>
              <li>
                <strong>"Edited Output"</strong> means the deliverables we
                produce from Client Content according to your instructions.
              </li>
              <li>
                <strong>"Third‑Party Materials"</strong> means content not owned
                by you or Company (for example, stock footage, music, fonts,
                templates, plug‑ins, libraries, or other licensed assets).
              </li>
              <li>
                <strong>"Program"</strong> means the optional Research,
                Development & Curated Dataset Program described in Section 9.
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              4. OWNERSHIP; LICENSES
            </h2>

            <h3 className="text-xl font-semibold text-white mb-4">
              4.1 Ownership
            </h3>
            <ul className="text-zinc-300 leading-relaxed space-y-4 mb-6">
              <li>As between you and Company, you own Client Content.</li>
              <li>
                Upon full payment, delivery and compliance with these Terms,
                Company assigns to you all right, title, and interest it may
                have in the Edited Output, excluding Company Background IP and
                any third‑party materials. Company retains all rights in its
                Background IP and grants you a non‑exclusive, perpetual,
                worldwide, royalty‑free license to use Background IP as embedded
                in the Edited Output (not separately).
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-white mb-4">
              4.2 License to perform the Services
            </h3>
            <p className="text-zinc-300 leading-relaxed mb-6">
              You grant Company and its personnel (including independent
              contractor editors) a non‑exclusive, worldwide, royalty‑free
              license to host, copy, transcode, edit, create derivative works
              from, and otherwise process Client Content solely to provide the
              Services and deliver the Edited Output. This license ends when
              Services are completed and the retention periods in the Privacy
              Policy expire, except as required by law.
            </p>

            <h3 className="text-xl font-semibold text-white mb-4">
              4.3 Third‑Party Materials & rights clearance
            </h3>
            <ul className="text-zinc-300 leading-relaxed space-y-4 mb-6">
              <li>
                <strong>No procurement or clearance.</strong> Neither Company
                nor its editors purchase, license, clear, or otherwise procure
                Third‑Party Materials or rights for you. We do not provide legal
                advice or rights‑clearance services.
              </li>
              <li>
                <strong>Client responsibility.</strong> You are solely
                responsible for securing and maintaining all rights,
                permissions, releases, and licenses for any Third‑Party
                Materials and publicity/likeness rights included at your request
                or direction, and for your intended exploitation of the Edited
                Output.
              </li>
              <li>
                <strong>No duty to police; independent contractors.</strong>{" "}
                Editors are independent contractors and are not authorized to
                bind Company. We do not monitor or verify licensing for
                Third‑Party Materials and have no obligation to do so. Inclusion
                of any Third‑Party Materials at your request does not create any
                warranty or obligation by Company regarding rights sufficiency.
              </li>
              <li>
                <strong>Risk allocation & indemnity.</strong> To the fullest
                extent permitted by law, you assume responsibility for claims
                arising from your requested inclusion or use of Third‑Party
                Materials or specific content (including copyrighted songs or
                clips). Without limiting §15, you will defend, indemnify, and
                hold harmless Company and its personnel from any claims,
                damages, takedowns, costs, or liabilities arising from such
                requests or materials.
              </li>
              <li>
                <strong>Right to decline.</strong> We may decline instructions
                or materials that appear unlawful, improperly licensed, or
                unsafe.
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-white mb-4">
              4.4 Third‑party materials in Edited Output
            </h3>
            <p className="text-zinc-300 leading-relaxed mb-6">
              Any Third‑Party Materials incorporated in the Edited Output remain
              subject to their own license terms. You are responsible for
              complying with those terms, including any attribution, scope, or
              usage restrictions.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              5. OPTIONAL SHOWCASE (OPT‑IN)
            </h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              With your permission, we may include final Edited Outputs (not raw
              uploads) in our portfolio (website, social channels, case studies,
              award entries, or new‑client pitches).
            </p>
            <ul className="text-zinc-300 leading-relaxed space-y-4">
              <li>
                <strong>Opt‑in only.</strong> This is off by default and
                requires your clear opt‑in at checkout/upload. If you don't opt
                in, we won't showcase your work.
              </li>
              <li>
                <strong>Scope.</strong> Non‑exclusive, worldwide, royalty‑free
                right to display the Edited Output solely for the above
                purposes. Company may make light, non‑substantive formatting
                adjustments (resizing, compression, tasteful watermarks) to suit
                display contexts; no creative changes.
              </li>
              <li>
                <strong>Likeness & releases.</strong> By opting in, you agree
                that any names/likenesses that appear in the Edited Output may
                be shown for the limited showcase purpose and you represent and
                warrant that you have obtained all necessary
                permissions/releases from other identifiable people featured. On
                request, we may apply redactions or seek additional releases.
              </li>
              <li>
                <strong>Withdrawal.</strong> You may withdraw at any time via{" "}
                <a
                  href="mailto:mementiq@seraphventures.net"
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  mementiq@seraphventures.net
                </a>. We will cease new uses and remove
                the piece from active showcases within a reasonable period (this
                does not require recall of printed materials or past award
                submissions).
              </li>
              <li>
                <strong>Editors' portfolios.</strong> Editors do not have
                independent portfolio rights under these Terms. Any editor
                display would require your separate written approval.
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              6. PROHIBITED CONTENT & CONDUCT
            </h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              You agree not to submit or request edits to content that is
              illegal or violates rights of others, including:
            </p>
            <ul className="text-zinc-300 leading-relaxed space-y-4 mb-4">
              <li>
                CSAM/child endangerment; sexual/suggestive content involving
                anyone under 18; non‑consensual intimate imagery; sexual
                exploitation.
              </li>
              <li>
                Infringing content (copyright/trademark), counterfeit or pirated
                materials.
              </li>
              <li>
                Unlawful surveillance, doxxing, or highly sensitive personal
                data without lawful basis and consent.
              </li>
              <li>
                Hate speech intended to threaten or incite violence; credible
                threats; harassment and stalking.
              </li>
              <li>Malware or security threats.</li>
            </ul>
            <p className="text-zinc-300 leading-relaxed">
              We may pause or terminate work, remove materials from our systems,
              and report suspected illegal content to NCMEC or law enforcement
              as required by law.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              7. YOUR RESPONSIBILITIES; WARRANTIES
            </h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              You represent and warrant that:
            </p>
            <ol className="text-zinc-300 leading-relaxed space-y-4 list-decimal list-inside mb-4">
              <li>
                You have and will maintain all rights, licenses, permissions,
                and releases necessary for us to perform the Services and
                deliver the Edited Output, including for any Third‑Party
                Materials included at your request or direction; you further
                acknowledge that Company does not perform rights clearance and
                relies on your confirmations.
              </li>
              <li>
                Client Content and your instructions will not violate law or
                third‑party rights, including copyright, trademark, publicity,
                privacy, or defamation laws, and will not require handling of
                illegal content.
              </li>
              <li>
                You are solely responsible for where and how the Edited Output
                is used or published, and for any required notices, attribution,
                or license compliance.
              </li>
              <li>
                You will maintain backup copies of Client Content and
                deliverables; the Services are not a backup or archival service.
              </li>
            </ol>
            <p className="text-zinc-300 leading-relaxed">
              If we receive a claim or takedown related to your Client Content,
              your instructions, or materials you directed us to include, we may
              pause work, remove materials from our systems, and request your
              prompt cooperation to resolve the issue.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              8. PAYMENT; TAXES; REFUNDS
            </h2>
            <ul className="text-zinc-300 leading-relaxed space-y-4">
              <li>
                <strong>Fees.</strong> You agree to pay the fees quoted or
                otherwise presented at order/checkout, plus applicable taxes.
                Prices are in U.S. dollars unless stated otherwise.
              </li>
              <li>
                <strong>Payment processor (Stripe).</strong> We use Stripe to
                process payments. By paying, you agree to Stripe's Services
                Agreement and{" "}
                <a
                  href="/privacy-policy"
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  Privacy Policy
                </a>. Stripe processes and stores your
                payment credentials; we do not store full card numbers.
              </li>
              <li>
                <strong>Authorization & accuracy.</strong> You authorize us (and
                Stripe) to charge your payment method for the Services you
                select, including applicable taxes and one‑time and recurring
                charges. You agree to maintain accurate billing information and
                sufficient funds.
              </li>
              <li>
                <strong>Corrections.</strong> We may correct, or instruct Stripe
                to correct, any billing errors or mistakes, even if payment has
                already posted.
              </li>
              <li>
                <strong>Chargebacks.</strong> If you dispute a charge, contact
                us first at{" "}
                <a
                  href="mailto:mementiq@seraphventures.net"
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  mementiq@seraphventures.net
                </a>. We may dispute
                unfounded chargebacks and may suspend or terminate accounts
                involved in payment fraud or abuse. You are responsible for bank
                fees, currency exchange fees, and taxes associated with your
                transactions.
              </li>
              <li>
                <strong>Refunds.</strong> Unless required by law, fees are
                non‑refundable once editing work has commenced. If we cannot
                complete a project due to our fault, we may, in our discretion,
                issue a partial or full refund.
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              9. OPTIONAL RESEARCH, DEVELOPMENT & CURATED DATASET PROGRAM
              (OPT‑IN)
            </h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              With your permission, we may use Client Content and/or Edited
              Outputs to help train, fine‑tune, evaluate, and improve our
              editing systems. In limited cases, we may make curated,
              de‑identified datasets available to trusted research partners for
              similar improvement purposes under strict agreements, which may
              include licensing or sale of such datasets.
            </p>
            <ul className="text-zinc-300 leading-relaxed space-y-4">
              <li>
                <strong>Controller role & consent.</strong> Participation is off
                by default and requires your explicit consent. For this Program,
                Company acts as an independent controller/business of the data
                used, as described in the{" "}
                <a
                  href="/privacy-policy"
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  Privacy Policy
                </a>.
              </li>
              <li>
                <strong>License for Program.</strong> If you opt in, you grant
                Company a non‑exclusive, worldwide, royalty‑free license to use,
                reproduce, create derivative works from, and process Client
                Content and Edited Outputs for the Program purposes. You may
                withdraw at any time; we will stop future use and remove your
                content from corpora going forward. Learned model parameters may
                not be reversible. We will not newly share datasets including
                your content after withdrawal and will request deletion from
                prior recipients where feasible.
              </li>
              <li>
                <strong>Partner protections.</strong> Any partners receiving
                curated, de‑identified datasets are bound by agreements limiting
                use to model development/evaluation and prohibiting
                re‑identification, advertising uses, or onward resale, and
                requiring appropriate security. We publicly commit not to
                re‑identify de‑identified data.
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              10. STORAGE; DELIVERY; DELETION
            </h2>
            <ul className="text-zinc-300 leading-relaxed space-y-4">
              <li>
                <strong>Delivery.</strong> We will deliver Edited Outputs via
                download link or other reasonable means. You are responsible for
                promptly downloading and safekeeping deliverables.
              </li>
              <li>
                <strong>Retention.</strong> We retain Client Content and Edited
                Outputs consistent with our{" "}
                <a
                  href="/privacy-policy"
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  Privacy Policy
                </a>. If you do not opt
                into the Program, we delete Client Content after the standard
                window; if you opt in, we may retain copies for Program purposes
                subject to withdrawal and retention limits.
              </li>
              <li>
                <strong>No archival service.</strong> We may purge files
                following delivery or expiration of retention windows. Maintain
                your own backups.
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              11. DMCA & REPEAT INFRINGER POLICY
            </h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              We respect intellectual property rights and respond to notices
              under the Digital Millennium Copyright Act (17 U.S.C. §512). This
              section applies only to content we host or control (e.g.,
              materials on our websites/social channels or files stored on our
              systems at a client's direction).
            </p>
            <ul className="text-zinc-300 leading-relaxed space-y-4 mb-4">
              <li>
                <strong>Notices.</strong> Send DMCA notices with the elements of
                §512(c)(3) to:{" "}
                <a
                  href="mailto:mementiq@seraphventures.net"
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  mementiq@seraphventures.net
                </a>
              </li>
              <li>
                <strong>Counter‑notices.</strong> If material was removed by
                mistake or misidentification, you may submit a counter‑notice
                under §512(g).
              </li>
              <li>
                <strong>Repeat infringers.</strong> We may suspend/terminate
                accounts of repeat infringers and remove allegedly infringing
                material.
              </li>
            </ul>
            <p className="text-zinc-300 leading-relaxed">
              We don't adjudicate licensing disputes between clients and third
              parties; we act on facially valid notices for content we host.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              12. CONFIDENTIALITY
            </h2>
            <p className="text-zinc-300 leading-relaxed">
              We will treat Client Content as confidential and will not disclose
              it except to perform the Services, comply with law, or as
              otherwise permitted by these Terms and the Privacy Policy. Our
              personnel and contractors are bound by confidentiality
              obligations. Confidentiality does not apply to information that is
              or becomes public through no fault of ours, was lawfully known to
              us before receipt, is independently developed without reference to
              your information, or is rightfully received from a third party
              without confidentiality obligations.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              13. DISCLAIMERS
            </h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              The Services and Edited Outputs are provided "as is" and "as
              available." To the maximum extent permitted by law, we disclaim
              all warranties, express or implied, including warranties of
              merchantability, fitness for a particular purpose, title, and
              non‑infringement. We do not provide legal advice or
              rights‑clearance services and we do not warrant that the Edited
              Output will be free of third‑party claims or compliant with your
              intended use; you are solely responsible for obtaining all
              necessary rights and approvals.
            </p>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Without limiting the foregoing, we do not warrant that the
              Services will be uninterrupted, timely, secure, or error‑free, or
              that defects will be corrected. Certain features may rely on
              third‑party services (e.g., cloud hosting, storage, payment
              processing, integrations). We are not responsible for
              unavailability, limitations, or performance issues caused by
              third‑party services, networks, or providers.
            </p>
            <p className="text-zinc-300 leading-relaxed">
              Some jurisdictions do not allow the exclusion of certain
              warranties; to that extent, the above exclusions may not apply to
              you.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              14. LIMITATION OF LIABILITY
            </h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              To the maximum extent permitted by law, neither Company nor its
              officers, employees, or contractors will be liable for any
              indirect, incidental, special, consequential, exemplary, or
              punitive damages, or any loss of profits, revenue, goodwill, or
              data, arising out of or related to the Services or these Terms,
              even if advised of the possibility of such damages.
            </p>
            <p className="text-zinc-300 leading-relaxed">
              Our total liability for all claims arising out of or related to
              the Services or these Terms will not exceed the amounts you paid
              to Company for the Services that gave rise to the claim in the 12
              months preceding the event giving rise to liability or $100,
              whichever is greater. Some jurisdictions do not allow certain
              limitations; these limits apply to the maximum extent permitted by
              law.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              15. INDEMNIFICATION
            </h2>
            <p className="text-zinc-300 leading-relaxed">
              You will defend, indemnify, and hold harmless Company and its
              officers, employees, and contractors from and against any claims,
              damages, liabilities, costs, and expenses (including reasonable
              attorneys' fees) arising out of or related to: (a) Client Content
              or your publication/distribution of Edited Outputs; (b) your
              breach of these Terms or applicable law; (c) your violation of
              third‑party rights (including IP, publicity, or privacy rights);
              or (d) your participation in the Program, including the absence of
              required permissions/releases. We may choose to participate in the
              defense with counsel of our choice at our expense.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              16. SUSPENSION; TERMINATION
            </h2>
            <p className="text-zinc-300 leading-relaxed">
              We may suspend or terminate the Services or your account with or
              without cause, including for non‑payment, suspected illegal
              activity, repeat infringement (as described in §11 DMCA), or
              material breach of these Terms. You may terminate at any time by
              closing your account. Sections that by their nature should survive
              termination (e.g., ownership of Edited Output, payment
              obligations, confidentiality, disclaimers, liability limits,
              indemnities, dispute resolution) survive termination.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              17. CHANGES TO THE SERVICES OR TERMS
            </h2>
            <p className="text-zinc-300 leading-relaxed">
              We may modify the Services and these Terms from time to time.
              Material changes will be posted with a new Effective Date and,
              where required, we will provide additional notice. Changes apply
              prospectively. If you continue to use the Services after changes
              become effective, you accept the revised Terms.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              18. DISPUTE RESOLUTION; ARBITRATION; GOVERNING LAW
            </h2>
            <ul className="text-zinc-300 leading-relaxed space-y-4">
              <li>
                <strong>Informal resolution.</strong> Before filing a claim, you
                agree to try to resolve the dispute informally by contacting{" "}
                <a
                  href="mailto:mementiq@seraphventures.net"
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  mementiq@seraphventures.net
                </a>{" "}with a brief description; we will
                respond within 30 days.
              </li>
              <li>
                <strong>Binding arbitration & class‑action waiver.</strong>{" "}
                Except for the small‑claims and injunctive relief carve‑outs
                below, any dispute arising out of or relating to these Terms or
                the Services will be resolved by binding arbitration on an
                individual basis under the AAA Consumer Rules. Class,
                collective, consolidated, or representative actions are not
                permitted.
              </li>
              <li>
                <strong>Procedure; seat; law.</strong> The arbitration will be
                conducted by the American Arbitration Association (AAA). The
                seat and place of arbitration is Bernalillo County, New Mexico.
                The Federal Arbitration Act (FAA) governs the interpretation and
                enforcement of this arbitration agreement; New Mexico law
                governs these Terms and any disputes not subject to arbitration.
              </li>
              <li>
                <strong>Carve‑outs.</strong> Either party may bring a claim in
                small claims court of competent jurisdiction or seek temporary
                or preliminary injunctive relief in court to protect its rights
                (including intellectual property or confidentiality) pending
                arbitration.
              </li>
              <li>
                <strong>30‑day opt‑out.</strong> You may opt out of this
                arbitration agreement by emailing{" "}
                <a
                  href="mailto:mementiq@seraphventures.net"
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  mementiq@seraphventures.net
                </a>{" "}
                within 30 days of first accepting these Terms, with your name,
                account email, and a statement that you opt out of arbitration.
                Your opt‑out will not affect other provisions of these Terms.
              </li>
              <li>
                <strong>Venue & jurisdiction (non‑arbitrable matters).</strong>{" "}
                For disputes not subject to arbitration, you agree to the
                exclusive jurisdiction and venue of the state and federal courts
                located in Bernalillo County, New Mexico.
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              19. MISCELLANEOUS
            </h2>
            <ul className="text-zinc-300 leading-relaxed space-y-4">
              <li>
                <strong>Assignment.</strong> You may not assign or transfer
                these Terms without our prior written consent; we may assign
                these Terms in connection with a merger, sale, or
                reorganization.
              </li>
              <li>
                <strong>Force majeure.</strong> We are not liable for delays or
                failures due to events beyond our reasonable control. This
                includes downtime by third party services providers used in
                delivery of Edited Content.
              </li>
              <li>
                <strong>Export & sanctions compliance.</strong> You will not use
                the Services in violation of U.S. export control or sanctions
                laws (including the EAR and OFAC programs). You represent you
                are not located in, owned/controlled by, or acting for a
                prohibited jurisdiction or restricted party and will not export,
                reexport, or transfer the Services, software, or related
                technical data to such destinations or parties. We may suspend
                or terminate access to comply with law. These obligations apply
                to both clients and contractors.
              </li>
              <li>
                <strong>Notices.</strong> We may provide notices via the
                Service, email, or your account dashboard. Legal notices to us
                should be sent to{" "}
                <a
                  href="mailto:mementiq@seraphventures.net"
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  mementiq@seraphventures.net
                </a>
              </li>
              <li>
                <strong>
                  Entire agreement; severability; waiver; no third‑party
                  beneficiaries.
                </strong>{" "}
                These Terms (plus incorporated policies) are the entire
                agreement between you and Company regarding the Services. If any
                provision is found unenforceable, it will be modified to the
                minimum extent necessary, and the remainder will remain in
                effect. Our failure to enforce a provision is not a waiver.
                There are no third‑party beneficiaries to these Terms.
              </li>
            </ul>
          </section>

          <p className="text-zinc-400 text-center">
            Last Updated: September 2, 2025
          </p>
        </div>
      </main>
    </div>
  );
}
