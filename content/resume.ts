/**
 * Resume, transcribed from Somesh's LaTeX source. Phone number, email and
 * home details are left out on purpose; the PDF (built from resume/resume.tex) has email and links but no phone.
 */
export const RESUME_PDF_URL = "/resume.pdf";

export const RESUME_SUMMARY =
  "Product designer and 0 to 1 specialist with 4+ years shipping products across 10+ domains in high-growth B2B and B2C teams. I've driven $1.5M+ in cost savings, helped win 10+ clients and shipped work used by 3M+ people in 22 countries. I bring an AI-first approach to every product I build, and I'm the Claude Ambassador for Anthropic in Sweden.";

interface ResumeProject {
  name: string;
  context: string;
  points: { label: string; text: string }[];
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
        name: "Canucci",
        context: "Strategic decision-making platform",
        points: [
          {
            label: "Impact",
            text: "Led the 0 to 1 launch of an AI-driven B2B SaaS platform that turned a proprietary methodology into a shipped product, won 5 new clients and hit investor milestones 30% faster than estimated.",
          },
          {
            label: "Execution",
            text: "Defined product strategy, used AI tooling to shorten prototyping, and set up a tokenized design system that gave engineering a production-ready foundation.",
          },
        ],
      },
      {
        name: "ROYC",
        context: "Private-market investment platform",
        points: [
          {
            label: "Impact",
            text: "Helped grow from 5 to 20 clients with a platform redesign, and introduced a modular white-label design system that saved an estimated EUR 200,000 of design and development effort across four SaaS products.",
          },
          {
            label: "Execution",
            text: "Led end-to-end UX for complex financial journeys, bridging founder vision and engineering constraints.",
          },
        ],
      },
      {
        name: "World Food Programme",
        context: "SchoolOps mobile-web app",
        points: [
          {
            label: "Scale",
            text: "Designed a mobile-first app that handles meal data for 3M students across 22 countries, removing the need for dedicated tablets and their hardware cost.",
          },
          {
            label: "Execution",
            text: "Ran UX audits, flow analysis and stakeholder workshops across 22 countries, then designed and tested prototypes for field operators and country-specific edge cases.",
          },
        ],
      },
      {
        name: "BMW Group",
        context: "Climate and Settings HMI apps",
        points: [
          {
            label: "Strategy",
            text: "Led the first pilot adapting BMW's Neue Klasse digital architecture to Rolls-Royce, reusing patterns across brands through a unified design library.",
          },
          {
            label: "Interaction design and AI",
            text: "Supported interaction design for the Climate and Settings apps and contributed to the AI strategy for a 150-person UX organisation.",
          },
        ],
      },
      {
        name: "Netlight",
        context: "HR management platform",
        points: [
          {
            label: "Efficiency",
            text: "Cut consultant allocation time from 1–2 days to near real time with a live staffing dashboard.",
          },
          {
            label: "Dual role",
            text: "Acted as product manager and UX lead: set the vision and roadmap, built a reusable design system and iterated through user testing.",
          },
        ],
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
        points: [
          {
            label: "Conversion",
            text: "Raised sourcing flow completion by 42% by simplifying search and filtering.",
          },
          {
            label: "Adoption",
            text: "Launched an automated quoting product that made Luminovo an end-to-end supply-chain tool and cut customer effort.",
          },
          {
            label: "Design library",
            text: "Contributed to the shared design library and used Amplitude and LogRocket to prioritise UX work.",
          },
        ],
      },
      {
        name: "OYO",
        context: "Global CRM platform",
        points: [
          {
            label: "Platform",
            text: "Designed a unified CRM for 90K+ users managing 850K+ partner properties, replacing seven legacy tools.",
          },
          {
            label: "Efficiency",
            text: "Halved agent workflow time through iterative user testing, saving $1.2M+ a year.",
          },
        ],
      },
    ],
  },
];

export const EDUCATION = [
  {
    degree: "M.Sc. Human-Computer Interaction and Design",
    school: "KTH Royal Institute of Technology, Sweden",
  },
  {
    degree: "Diploma in Entrepreneurship and Innovation",
    school: "European Institute of Innovation and Technology (EIT)",
  },
  { degree: "B.Tech. Electronics and Communication with IoT", school: "VIT University, India" },
] as const;

export const SKILLS = [
  {
    area: "Design and craft",
    items:
      "AI-assisted design, human-AI interaction, AI product strategy, UX design, interface design (responsive, design systems, accessibility, typography, iconography), data visualisation, prototyping and motion, UX research",
  },
  {
    area: "Leadership",
    items:
      "Product thinking, data- and human-driven design, cross-functional influence, stakeholder management, workshop facilitation, mentorship",
  },
  {
    area: "Tools",
    items:
      "Claude, Cursor, v0, Midjourney, Figma, Lottie Lab, Framer, Maze, Amplitude, LogRocket, Adobe CC",
  },
] as const;

export const BEYOND_WORK = [
  {
    label: "Community",
    text: "Claude Ambassador for Anthropic in Sweden, hosting Claude for Designers meetups. Organiser of the Into Design Systems meetup series in Stockholm.",
  },
  { label: "Mentorship", text: "Mentor to 10+ junior designers." },
] as const;
