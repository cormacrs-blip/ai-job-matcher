export const workArrangements = ["Remote", "Hybrid", "On-site"] as const;
export type WorkArrangement = (typeof workArrangements)[number];

import type { RoleCriteria } from "./matching/evaluator";
export type Job = RoleCriteria & {
  id: number;
  title: string;
  company: string;
  initials: string;
  color: string;
  location: string;
  remote: WorkArrangement;
  salaryMin: number;
  salaryMax: number;
  tags: string[];
  posted: string;
  description: string;
  responsibilities: string[];
  essentials: string[];
  preferred: string[];
};
export type Preferences = {
  role: string;
  location: string;
  arrangements: WorkArrangement[];
  salary: number;
};
export const jobs: Job[] = [
  {
    id: 1,
    title: "Digital Business Analyst",
    company: "Meridian",
    initials: "M",
    color: "mint",
    location: "Vancouver, BC",
    remote: "Remote",
    salaryMin: 85000,
    salaryMax: 105000,
    central: ["requirements", "process", "uat"],
    tags: ["Requirements", "Process mapping", "UAT"],
    posted: "Fictional example",
    description:
      "Improve a Canadian ecommerce checkout by turning customer and operational problems into tested delivery requirements. You will work with a product owner, designers and engineers; this is delivery analysis rather than software development.",
    responsibilities: [
      "Lead discovery workshops and document acceptance criteria for checkout changes.",
      "Map current and future fulfilment processes and validate improvements with operations.",
      "Plan user acceptance testing, triage defects and verify releases against agreed outcomes.",
    ],
    essentials: [
      "Evidence of digital requirements discovery and process mapping.",
      "Experience coordinating UAT with business users.",
    ],
    preferred: [
      "Familiarity with ecommerce and web analytics; equivalent digital delivery is welcome.",
    ],
    requiresFrench: false,
  },
  {
    id: 2,
    title: "Product Owner",
    company: "Northstar",
    initials: "N",
    color: "peach",
    location: "Toronto, ON",
    remote: "Hybrid",
    salaryMin: 90000,
    salaryMax: 120000,
    central: ["roadmap", "discovery", "backlog"],
    tags: ["Roadmap", "Discovery", "Prioritization"],
    posted: "Fictional example",
    description:
      "Own improvements to a B2B ordering platform used by retail buyers. Translate research into roadmap choices and delivery priorities. This role owns product tradeoffs within one team, not a company-wide P&L.",
    responsibilities: [
      "Own a quarterly roadmap and explain value-based tradeoffs.",
      "Conduct customer discovery and turn findings into testable product opportunities.",
      "Prioritize the backlog and collaborate with engineering on release scope.",
    ],
    essentials: [
      "Comparable evidence of roadmap accountability, discovery and prioritization.",
      "Ability to explain decisions using customer and business evidence.",
    ],
    preferred: [
      "Ecommerce platform experience is useful; no certification is required.",
    ],
    requiresFrench: false,
  },
  {
    id: 3,
    title: "Senior Business Analyst",
    company: "Forma",
    initials: "F",
    color: "lavender",
    location: "Vancouver, BC",
    remote: "Remote",
    salaryMin: 110000,
    salaryMax: 140000,
    central: ["requirements", "process", "uat"],
    tags: ["Requirements", "Transformation", "UAT"],
    posted: "Fictional example",
    description:
      "Lead analysis for a digital ordering modernization programme. The defining work remains discovery, process improvement and acceptance testing. Seniority alone is not an automatic mismatch.",
    responsibilities: [
      "Facilitate cross-team requirements discovery and define acceptance criteria.",
      "Model operational processes and agree measurable improvement opportunities.",
      "Coordinate UAT across releases and resolve requirement ambiguities.",
    ],
    essentials: [
      "Substantial direct evidence across discovery, process analysis and UAT.",
      "Experience working with multiple business teams.",
    ],
    preferred: ["Prior ecommerce delivery is helpful."],
    requiresFrench: false,
  },
  {
    id: 4,
    title: "Digital Project Manager",
    company: "Layers",
    initials: "L",
    color: "blue",
    location: "Montreal, QC",
    remote: "Remote",
    salaryMin: 85000,
    salaryMax: 110000,
    central: ["planning", "stakeholders", "delivery"],
    tags: ["Project planning", "Delivery", "French required"],
    posted: "Fictional example",
    description:
      "Deliver a customer self-service programme for a Quebec organization. Work with French-speaking business teams to agree scope, manage dependencies and coordinate releases. Professional French is an essential requirement, not a preference.",
    responsibilities: [
      "Own delivery plans, dependencies and risk responses.",
      "Align business and technical stakeholders on scope and change decisions.",
      "Take accountability for release coordination, budgets and delivery reporting.",
    ],
    essentials: [
      "Evidence of project planning and accountable digital delivery.",
      "Professional working French is mandatory for daily workshops.",
    ],
    preferred: ["Customer portal experience is useful."],
    requiresFrench: true,
  },
  {
    id: 5,
    title: "Analytics Engineer",
    company: "Orbit",
    initials: "O",
    color: "pink",
    location: "Calgary, AB",
    remote: "On-site",
    salaryMin: 95000,
    salaryMax: 125000,
    central: ["sql", "pipelines", "warehouse"],
    tags: ["Advanced SQL", "Pipelines", "Warehousing"],
    posted: "Fictional example",
    description:
      "Build reliable analytics infrastructure for a subscription business. This is hands-on data engineering, rather than interpreting dashboards or gathering business requirements. Supporting stakeholder skills cannot compensate for gaps in the defining technical work.",
    responsibilities: [
      "Write and optimize complex production SQL transformations.",
      "Build, monitor and troubleshoot production data pipelines.",
      "Design warehouse models and govern data quality.",
    ],
    essentials: [
      "Direct production evidence in SQL, pipelines and warehouse architecture.",
      "Ability to own operational reliability of data workflows.",
    ],
    preferred: [
      "dbt experience is useful; equivalent transformation tooling is accepted.",
    ],
    requiresFrench: false,
  },
];
export const defaultPreferences: Preferences = {
  role: "",
  location: "",
  arrangements: [],
  salary: 0,
};
export function filterJobs(items: Job[], preferences: Preferences) {
  return items.filter(
    (job) =>
      job.title.toLowerCase().includes(preferences.role.trim().toLowerCase()) &&
      job.location
        .toLowerCase()
        .includes(preferences.location.trim().toLowerCase()) &&
      (preferences.arrangements.length === 0 ||
        preferences.arrangements.includes(job.remote)) &&
      job.salaryMax >= preferences.salary,
  );
}
export function validateResume(file: { name: string; size: number }) {
  if (!/\.(pdf|docx)$/i.test(file.name))
    return "Please choose a PDF or DOCX file.";
  if (file.size === 0) return "This file is empty. Please choose another file.";
  if (file.size > 10 * 1024 * 1024)
    return "Please choose a file smaller than 10 MB.";
  return null;
}
export const salary = (value: number) => `$${Math.round(value / 1000)}k`;
