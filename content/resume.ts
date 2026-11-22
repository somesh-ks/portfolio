/**
 * Resume, transcribed from Somesh's LaTeX source. Phone number, email and
 * home details are left out on purpose; the PDF is built from resume/resume.tex on deploy and has no phone.
 */
export const RESUME_PDF_URL = "/resume.pdf";

export const RESUME_SUMMARY =
  "Product designer and 0 to 1 specialist with 4+ years across 10+ domains in B2B and B2C. $1.5M+ saved, 10+ clients won, and work used by 3M+ people in 22 countries.";

interface ResumeProject {
  name: string;
  context: string;
  /** One or two short sentences, numbers first. */
  outcome: string;
}

export interface ResumeRole {
  title: string;
  organisation: string;
  period: string;
  location: string;
  projects: ResumeProject[];
}

export const EXPERIENCE: ResumeRole[] = [
  {
    title: "Senior Product Designer",
    organisation: "Netlight Consulting",
    period: "Aug 2022 – present",
    location: "Stockholm, Sweden",
    projects: [
      {
        name: "Mercedes-Benz",
        context: "EAA accessibility compliance, 9,000+ vehicle fleet",
        outcome:
          "Audited web and mobile against EN 301 549 and WCAG 2.1 AA: 70% non-compliant, 143 failure points. Ran workshops to rank fixes by legal and user impact, and delivered a phased roadmap to full EU compliance.",
      },
      {
        name: "Canucci",
        context: "Strategic decision-making platform",
        outcome:
          "Led the 0 to 1 launch of an AI-driven B2B SaaS product with a tokenized design system. Won 5 new clients and hit investor milestones 30% faster than estimated.",
      },
      {
        name: "ROYC",
        context: "Private-market investment platform",
        outcome:
          "Redesigned the platform and built a white-label design system across four SaaS products. Grew from 5 to 20 clients and saved an estimated €200K.",
      },
      {
        name: "World Food Programme",
        context: "SchoolOps mobile-web app",
        outcome:
          "After audits and workshops in 22 countries, designed a mobile-first app that tracks meals for 3M students and removes the need for dedicated tablets.",
      },
      {
        name: "BMW Group",
        context: "Climate and Settings HMI apps",
        outcome:
          "Led the first pilot bringing the Neue Klasse digital architecture to Rolls-Royce, and contributed to the AI strategy of a 150-person UX organisation.",
      },
      {
        name: "Netlight",
        context: "HR management platform",
        outcome:
          "As product manager and UX lead, built a live staffing dashboard that cut consultant allocation from 1–2 days to near real time.",
      },
    ],
  },
  {
    title: "Freelance Product Designer",
    organisation: "Self-employed",
    period: "Jan 2019 – Jul 2022",
    location: "India, Germany, Sweden",
    projects: [
      {
        name: "Luminovo",
        context: "Electronics supply-chain platform",
        outcome:
          "Simplified search and filtering to raise sourcing completion by 42%, and launched automated quoting. Used Amplitude and LogRocket to set UX priorities.",
      },
      {
        name: "OYO",
        context: "Global CRM platform",
        outcome:
          "Replaced seven legacy tools with one CRM for 90K+ users and 850K+ properties. Halved agent workflow time, saving $1.2M+ a year.",
      },
    ],
  },
];

export const EDUCATION = [
  {
    degree: "M.Sc. Human-Computer Interaction and Design",
    school: "KTH Royal Institute of Technology",
  },
  { degree: "Diploma in Entrepreneurship and Innovation", school: "EIT" },
  {
    degree: "B.Tech. Electronics and Communication with IoT",
    school: "VIT University",
  },
] as const;

export const SKILLS = [
  {
    area: "Design",
    items:
      "AI-assisted design, human-AI interaction, AI product strategy, UX and interface design, design systems, accessibility, typography, data visualisation, prototyping, motion, UX research",
  },
  {
    area: "Leadership",
    items:
      "Product thinking, stakeholder management, cross-functional influence, workshop facilitation, mentorship",
  },
  {
    area: "Tools",
    items:
      "Claude, Cursor, v0, Midjourney, Figma, Lottie Lab, Framer, Maze, Amplitude, LogRocket, Adobe CC",
  },
] as const;

export const COMMUNITY = [
  "Claude Ambassador for Anthropic in Sweden, hosting Claude for Designers meetups",
  "Stripe Ambassador",
  "Organiser of the Into Design Systems meetups in Stockholm",
  "Mentor to 10+ junior designers",
] as const;
