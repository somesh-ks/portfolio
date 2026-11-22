import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { PROFILE } from "@content/profile";
import {
  BEYOND_WORK,
  EDUCATION,
  EXPERIENCE,
  RESUME_PDF_URL,
  RESUME_SUMMARY,
  SKILLS,
} from "@content/resume";
import { BackLink } from "@/components/editorial/BackLink";
import { PERSON_ID, serializeJsonLd } from "@/lib/schema-org";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Resume",
  description: RESUME_SUMMARY.slice(0, 155),
  alternates: { canonical: "/resume", types: { "text/markdown": "/resume.md" } },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  url: absoluteUrl("/resume"),
  mainEntity: {
    "@id": PERSON_ID,
    "@type": "Person",
    name: PROFILE.name,
    hasOccupation: EXPERIENCE.map((role) => ({ "@type": "Occupation", name: role.title })),
    alumniOf: EDUCATION.map((item) => ({ "@type": "EducationalOrganization", name: item.school })),
  },
};

export default function ResumePage() {
  return (
    <article className="entry resume">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <BackLink />
      <header className="entry__header">
        <h1 className="entry__title">Resume</h1>
        <p className="entry__summary">{RESUME_SUMMARY}</p>
        <p className="entry__links">
          <a href={RESUME_PDF_URL} className="button pressable" target="_blank" rel="noopener">
            PDF version <ArrowUpRight aria-hidden="true" size={14} />
          </a>
        </p>
      </header>

      <section aria-labelledby="experience" className="resume__section">
        <h2 id="experience" className="section-title">
          Experience
        </h2>
        {EXPERIENCE.map((role) => (
          <div key={role.title} className="resume__role">
            <header className="resume__role-head">
              <h3 className="resume__role-title">
                {role.title}, {role.organisation}
              </h3>
              <p className="resume__role-meta tabular">
                {role.period} · {role.location}
              </p>
            </header>
            {role.projects.map((project) => (
              <section key={project.name} className="resume__project" aria-label={project.name}>
                <h4 className="resume__project-title">
                  {project.name} <span className="resume__project-context">{project.context}</span>
                </h4>
                <ul className="resume__points">
                  {project.points.map((point) => (
                    <li key={point.label}>
                      <strong>{point.label}.</strong> {point.text}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ))}
      </section>

      <section aria-labelledby="education" className="resume__section">
        <h2 id="education" className="section-title">
          Education
        </h2>
        <ul className="resume__list">
          {EDUCATION.map((item) => (
            <li key={item.degree}>
              <span className="resume__strong">{item.degree}</span>
              <span className="resume__muted">{item.school}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="skills" className="resume__section">
        <h2 id="skills" className="section-title">
          Skills
        </h2>
        <dl className="facts">
          {SKILLS.map((skill) => (
            <div key={skill.area} className="facts__row">
              <dt>{skill.area}</dt>
              <dd>{skill.items}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="beyond" className="resume__section">
        <h2 id="beyond" className="section-title">
          Beyond work
        </h2>
        <ul className="resume__points">
          {BEYOND_WORK.map((item) => (
            <li key={item.label}>
              <strong>{item.label}.</strong> {item.text}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
