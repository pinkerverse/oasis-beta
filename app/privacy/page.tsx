import type { Metadata } from "next";

import LegalPage, {
  LegalList,
  LegalSection,
} from "@/app/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy · OASIS",
  description:
    "How OASIS handles educator, school and learner information.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="This policy explains how OASIS handles information about educators, schools and learners. It is written for an international school community and reflects the EU General Data Protection Regulation (GDPR), Germany’s data-protection framework and India’s Digital Personal Data Protection framework."
    >
      <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-5 py-4 text-sm leading-6 text-cyan-950">
        <p className="font-bold">The short version</p>
        <p className="mt-1">
          OASIS is an educator tool, not a service for children to use directly.
          Schools decide why learner records are created and who may access them.
          OASIS uses those records only to provide the service, does not sell them,
          and keeps teacher judgement in control of every assessment.
        </p>
      </div>

      <LegalSection title="1. Who is responsible for the data">
        <p>
          For learner records and school-directed educational content, the school,
          nursery or other setting using OASIS normally decides the purpose and
          lawful basis of processing. In European data-protection terms, that
          organisation is normally the controller and OASIS acts as its processor.
          Under India&apos;s Digital Personal Data Protection framework, the allocation
          of responsibility follows the parties&apos; actual role and applicable law.
        </p>
        <p>
          OASIS is responsible for data it uses for its own purposes, including
          account administration, service security, beta-access requests, service
          communications and legal compliance.
        </p>
        <p>
          Questions may be sent to{" "}
          <a
            href="mailto:privacy@useoasis.app"
            className="font-semibold text-cyan-800 underline underline-offset-4"
          >
            privacy@useoasis.app
          </a>
          . Where a request concerns a learner record, we may refer it to the
          relevant school because the school controls that record.
        </p>
      </LegalSection>

      <LegalSection title="2. Information OASIS handles">
        <LegalList>
          <li>
            <strong>Account information:</strong> an educator&apos;s name, email
            address, authentication information, role and account status.
          </li>
          <li>
            <strong>School information:</strong> school or setting name, country,
            classes, staff access, invitations, academic years, terms and configured
            assessment frameworks.
          </li>
          <li>
            <strong>Learner information:</strong> school-generated learner
            identifiers, initials, class, birth month and year, support flags,
            observations, evidence, teacher judgements, baselines and next steps.
          </li>
          <li>
            <strong>Uploaded and generated content:</strong> framework documents,
            notes, reports and AI-supported analysis created at a user&apos;s request.
          </li>
          <li>
            <strong>Technical information:</strong> authentication session data,
            request logs, device/browser information, IP address, timestamps and
            security events needed to operate and protect the service.
          </li>
          <li>
            <strong>Communications:</strong> beta requests, support messages and
            invitation or service-delivery records.
          </li>
        </LegalList>
        <p>
          OASIS is not designed to hold protected health information, medical
          diagnoses, safeguarding case files, government identity numbers,
          financial information or other data that is not necessary for observation
          and assessment. Users must not enter such information into free-text
          observations or uploads.
        </p>
      </LegalSection>

      <LegalSection title="3. Why information is used">
        <LegalList>
          <li>to create accounts, authenticate users and manage permissions;</li>
          <li>to provide journals, assessment views, planning prompts and reports;</li>
          <li>to analyse observations and surface evidence for teacher review;</li>
          <li>to invite colleagues and send essential service communications;</li>
          <li>to prevent misuse, investigate incidents and keep OASIS reliable;</li>
          <li>to answer support requests and improve service quality; and</li>
          <li>to meet legal obligations and establish or defend legal claims.</li>
        </LegalList>
        <p>
          For European users, OASIS relies as appropriate on performance of a
          contract, legitimate interests in operating and securing the service,
          compliance with legal obligations, or consent where consent is required.
          The school is responsible for selecting and documenting the appropriate
          lawful basis for learner data, including any requirements arising from
          education law, employment law or public-task responsibilities.
        </p>
        <p>
          For Indian users, personal data is processed for a lawful purpose on the
          basis selected by the responsible Data Fiduciary, including valid consent
          or another use permitted by applicable law. Required notices and rights
          must remain clear and accessible.
        </p>
      </LegalSection>

      <LegalSection title="4. Children and learner records">
        <p>
          OASIS is provided to authorised adults working for schools and early-years
          settings. Children do not create OASIS accounts, accept these terms or
          interact with the service directly.
        </p>
        <p>
          Each school must have authority to enter learner data, give families and
          staff any required notices, obtain verifiable parental or guardian consent
          where the law requires it, and honour applicable education-record rights.
          This is particularly important because India&apos;s framework treats a person
          under 18 as a child, while European rules give children specific protection.
        </p>
        <p>
          OASIS applies data-minimising presentation: learner profiles use initials
          or school-generated IDs, birth information is limited to month and year,
          and known learner names are replaced with initials before supported
          observation analysis. Schools must not enter full learner names or
          unnecessary identifying detail in narrative text or uploads.
        </p>
      </LegalSection>

      <LegalSection title="5. AI-supported features">
        <p>
          OASIS may send the minimum relevant observation text, learner initials,
          age context and framework material to an AI service to create a draft
          analysis. It does not send a learner&apos;s full birth date in the analysis
          request. OASIS configures supported requests not to create application
          response history and does not opt in to model training with school data.
          The AI provider may retain limited abuse-monitoring logs under its service
          terms unless a separately approved zero-retention arrangement applies.
        </p>
        <p>
          AI output may be incomplete or wrong. It is a suggestion for a qualified
          educator to review, edit or reject—not a final assessment, diagnosis,
          safeguarding decision or solely automated decision with legal or similarly
          significant effects.
        </p>
      </LegalSection>

      <LegalSection title="6. Service providers and disclosure">
        <p>
          OASIS uses carefully selected providers to operate the service. Current
          provider categories include:
        </p>
        <LegalList>
          <li>
            <strong>Supabase</strong> for authentication and database services;
          </li>
          <li>
            <strong>Vercel</strong> for application hosting and delivery;
          </li>
          <li>
            <strong>OpenAI</strong> for requested AI-supported analysis; and
          </li>
          <li>
            <strong>Resend and connected email services</strong> for account,
            invitation and support communications.
          </li>
        </LegalList>
        <p>
          These providers may process data only to deliver their contracted service
          to OASIS and under their applicable data-protection terms. OASIS may also
          disclose information when legally required, to protect users or the
          service, or as part of a genuine corporate transaction subject to
          appropriate confidentiality and notice.
        </p>
        <p>OASIS does not sell learner or educator personal data.</p>
      </LegalSection>

      <LegalSection title="7. International data transfers">
        <p>
          OASIS and its providers may process information in countries other than
          the user&apos;s own. Where the GDPR applies to a transfer outside the EEA,
          OASIS uses an available lawful transfer mechanism, such as an adequacy
          decision or the European Commission&apos;s Standard Contractual Clauses,
          together with supplementary safeguards where required. Transfers from
          India are handled in accordance with any restrictions notified under
          applicable Indian law.
        </p>
      </LegalSection>

      <LegalSection title="8. Retention and deletion">
        <p>
          School content is kept while the school&apos;s account is active and for a
          limited period afterwards so that the service can be closed, exported or
          restored where appropriate. Account, invitation, security and support
          records are retained only for as long as needed for the purpose collected,
          contractual or legal requirements, dispute resolution and fraud prevention.
          Backups, where retained, follow the restoration and expiry schedules of the
          relevant service provider.
        </p>
        <p>
          A school administrator may request deletion or export by contacting OASIS.
          OASIS may retain a narrowly limited record where law requires it or where
          needed to establish, exercise or defend legal claims.
        </p>
      </LegalSection>

      <LegalSection title="9. Security and incidents">
        <p>
          OASIS uses measures appropriate to the nature of the information, including
          authenticated access, school/workspace separation, role-based permissions,
          encryption provided by its hosting and database services, data minimisation
          and restricted administrative access. No service can promise absolute
          security. Users must protect account credentials and promptly report
          suspected unauthorised access.
        </p>
        <p>
          OASIS investigates personal-data incidents and will notify affected schools,
          authorities or individuals when and within the time required by applicable
          law.
        </p>
      </LegalSection>

      <LegalSection title="10. Cookies and similar storage">
        <p>
          OASIS currently uses only storage that is necessary to authenticate users,
          maintain secure sessions, remember essential service state and prevent
          abuse. OASIS does not currently use advertising cookies or cross-site
          behavioural tracking. If optional analytics or marketing technologies are
          introduced, this policy and any required consent controls will be updated
          before they are enabled.
        </p>
      </LegalSection>

      <LegalSection title="11. Your rights">
        <p>
          Depending on location and context, an individual may have rights to access,
          correct, complete, erase, restrict or object to processing, receive a copy
          of data, withdraw consent, nominate another person, and obtain grievance
          redressal. Exercising a right does not affect processing already lawfully
          carried out. Some rights are subject to legal exceptions.
        </p>
        <p>
          For learner data, contact the school first. For OASIS account or service
          data, email{" "}
          <a
            href="mailto:privacy@useoasis.app"
            className="font-semibold text-cyan-800 underline underline-offset-4"
          >
            privacy@useoasis.app
          </a>
          . OASIS may need to verify identity before fulfilling a request.
        </p>
        <p>
          Individuals in the EEA may complain to the data-protection authority for
          their habitual residence, workplace or the alleged infringement. Individuals
          in India may use OASIS&apos;s grievance process and, where available under the
          phased law, the Data Protection Board of India process.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes to this policy">
        <p>
          OASIS may update this policy when the product, providers or law changes.
          The current version and effective date will remain available here. Material
          changes will be communicated through the service or by email where required.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
