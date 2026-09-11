import type { Metadata } from "next";

import LegalPage, {
  LegalList,
  LegalSection,
} from "@/app/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Use · OASIS",
  description: "The terms governing authorised use of OASIS.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      description="These terms govern access to the OASIS private beta and service. They are designed for schools, early-years settings, educators and authorised staff—not for use by children directly."
    >
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4 text-sm leading-6 text-indigo-950">
        By creating an account, accepting an invitation or using OASIS, you agree
        to these terms on behalf of yourself and, where applicable, the school or
        organisation that authorised your access.
      </div>

      <LegalSection title="1. The service">
        <p>
          OASIS is an educator-support platform for recording observations,
          organising evidence, reviewing learning patterns and preparing draft
          planning or reporting material. During the private beta, features may be
          refined, added or withdrawn as OASIS learns from authorised testers.
        </p>
        <p>
          OASIS is not a medical, psychological, safeguarding or legal service and
          is not a substitute for professional educator judgement or the policies of
          the relevant school.
        </p>
      </LegalSection>

      <LegalSection title="2. Who may use OASIS">
        <p>
          Users must be at least 18, be legally capable of accepting these terms and
          be authorised by the relevant school or setting. OASIS accounts are for
          educators, school leaders, teaching assistants and other authorised adults.
          Children must not be given accounts or asked to use the service directly.
        </p>
        <p>
          A person accepting these terms for an organisation confirms that they have
          authority to bind that organisation. Each organisation is responsible for
          assigning appropriate roles and promptly removing access that is no longer
          required.
        </p>
      </LegalSection>

      <LegalSection title="3. Accounts and access">
        <LegalList>
          <li>Provide accurate account and school information.</li>
          <li>Use a separate account for each person; do not share sign-ins.</li>
          <li>Protect passwords and devices and use reasonable security measures.</li>
          <li>Notify OASIS promptly about suspected loss or unauthorised access.</li>
          <li>Do not access another school, class or learner without authorisation.</li>
        </LegalList>
        <p>
          The school administrator controls invitations and school-level access.
          OASIS may suspend an account where reasonably necessary to investigate a
          security risk, misuse or breach of these terms.
        </p>
      </LegalSection>

      <LegalSection title="4. School and learner responsibilities">
        <p>
          The school determines why learner information is entered and remains
          responsible for its accuracy, lawfulness and educational use. Before using
          OASIS with learner information, the school must:
        </p>
        <LegalList>
          <li>have an appropriate legal basis and organisational authority;</li>
          <li>provide required information to staff, families and learners;</li>
          <li>obtain parental or guardian consent where applicable law requires it;</li>
          <li>limit data to what is relevant for observation and assessment;</li>
          <li>
            use learner initials or school-generated IDs and birth month/year only;
          </li>
          <li>
            never enter protected health information, medical records, diagnoses or
            safeguarding case information; and
          </li>
          <li>review permissions, exports and generated content before sharing them.</li>
        </LegalList>
        <p>
          The school remains responsible for responding to requests concerning its
          learner records. OASIS will provide reasonable assistance where required
          by the parties&apos; data-processing arrangements and applicable law.
        </p>
      </LegalSection>

      <LegalSection title="5. AI-supported output and educator review">
        <p>
          Some OASIS features use automated systems to suggest framework matches,
          learning patterns, next steps or draft wording. These outputs are
          probabilistic and may be inaccurate, incomplete or unsuitable for a
          particular learner or setting.
        </p>
        <p>
          A qualified educator must review and take responsibility for any output
          before relying on, saving, sharing or acting on it. Users must not use an
          OASIS suggestion as the sole basis for a high-impact decision, diagnosis,
          safeguarding conclusion, placement decision or formal determination about
          a child.
        </p>
      </LegalSection>

      <LegalSection title="6. Acceptable use">
        <p>You must not:</p>
        <LegalList>
          <li>break the law or another person&apos;s rights;</li>
          <li>upload content you are not authorised or licensed to use;</li>
          <li>enter information unrelated to the educational purpose of OASIS;</li>
          <li>attempt to bypass access controls or test security without permission;</li>
          <li>introduce malware, disrupt the service or use it to harm another person;</li>
          <li>scrape, resell or provide unauthorised access to the service; or</li>
          <li>misrepresent AI-supported output as independently verified fact.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="7. Your content and framework materials">
        <p>
          The school or relevant rights holder retains ownership of content uploaded
          to OASIS. The school grants OASIS a limited right to host, copy, process and
          display that content only as needed to provide, secure and support the
          service and meet legal obligations.
        </p>
        <p>
          Users must have permission or an appropriate licence for every assessment
          framework, document, image or other third-party resource they upload.
          Uploading a framework does not transfer ownership to OASIS or add it to a
          public library unless the rights holder separately agrees.
        </p>
        <p>
          OASIS owns its software, design, branding and service-generated product
          structure. Subject to these terms, OASIS gives each authorised user a
          limited, non-exclusive, non-transferable and revocable right to use the
          service for the organisation&apos;s internal educational work.
        </p>
      </LegalSection>

      <LegalSection title="8. Privacy and confidentiality">
        <p>
          The OASIS Privacy Policy forms part of these terms. Each party must protect
          confidential information it receives and use it only for the authorised
          purpose. Where required, OASIS and the school will enter into an appropriate
          data-processing agreement before production use.
        </p>
      </LegalSection>

      <LegalSection title="9. Beta availability and changes">
        <p>
          OASIS aims to provide a reliable service but the private beta is supplied
          for evaluation and may contain errors or experience interruptions. OASIS
          may change features to improve safety, legal compliance or product quality.
          Reasonable notice will be given before a material change that significantly
          reduces paid functionality, where feasible and contractually required.
        </p>
      </LegalSection>

      <LegalSection title="10. Ending access">
        <p>
          A user may stop using OASIS at any time. A school administrator may remove
          a user&apos;s access. OASIS may suspend or end access for material breach,
          unlawful use, security risk, non-payment under a future paid plan or where
          continuing the service would create legal or technical harm.
        </p>
        <p>
          On termination, the school should request any permitted export within the
          communicated retrieval period. OASIS will delete or return school content
          in line with applicable data-processing terms, legal requirements and its
          backup schedule.
        </p>
      </LegalSection>

      <LegalSection title="11. Warranties and liability">
        <p>
          Nothing in these terms excludes liability that cannot lawfully be excluded,
          including liability for fraud, wilful misconduct, death or personal injury
          caused by negligence where applicable. Mandatory rights under German,
          Indian or other applicable law remain unaffected.
        </p>
        <p>
          Subject to those mandatory rights, OASIS is provided on an “as available”
          basis during beta. OASIS does not warrant that AI-supported output is
          accurate or that the service will be uninterrupted. OASIS is not responsible
          for educational decisions made without appropriate professional review, or
          for loss caused by unauthorised user content, shared credentials or use
          contrary to these terms.
        </p>
        <p>
          Any financial liability cap, service-level commitment or paid subscription
          term stated in a signed order or school agreement takes precedence over this
          general section to the extent of a conflict.
        </p>
      </LegalSection>

      <LegalSection title="12. Governing terms and local law">
        <p>
          A signed school agreement or order form takes priority if it conflicts with
          these online terms. The contracting OASIS entity and governing law will be
          identified in the applicable school agreement or order before paid or
          production use.
          Where the contracting entity is established in Germany, German law applies;
          where it is established in India, Indian law applies, in each case without
          removing protections that cannot be waived under the law applicable to the
          user or school.
        </p>
      </LegalSection>

      <LegalSection title="13. Contact and updates">
        <p>
          Questions about these terms may be sent to{" "}
          <a
            href="mailto:privacy@useoasis.app"
            className="font-semibold text-cyan-800 underline underline-offset-4"
          >
            privacy@useoasis.app
          </a>
          . OASIS may update these terms as the service or law changes. Material
          changes will be communicated where required, and the current effective date
          will always appear at the top of this page.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
