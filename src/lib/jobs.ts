export type Job = {
  id: number;
  title: string;
  company: string;
  initials: string;
  color: string;
  location: string;
  remote: "Remote" | "Hybrid" | "On-site";
  salaryMin: number;
  salaryMax: number;
  score: number;
  tags: string[];
  explanation: string;
  gap: string;
  posted: string;
  description: string;
};
export type Preferences = {
  role: string;
  location: string;
  remote: string;
  salary: number;
};
export const jobs: Job[] = [
  {
    id: 1,
    title: "Senior Product Designer",
    company: "Forma",
    initials: "F",
    color: "lavender",
    location: "Vancouver, BC",
    remote: "Remote",
    salaryMin: 110000,
    salaryMax: 145000,
    score: 94,
    tags: ["Product design", "Figma", "Design systems"],
    explanation:
      "This example highlights product design, user research, and design systems experience as potential areas of alignment.",
    gap: "This sample role asks for experience mentoring other designers.",
    posted: "2 days ago",
    description:
      "Help a small product team make complex workflows feel simple. Partner with engineering and research to shape a collaborative workspace used by growing teams.",
  },
  {
    id: 2,
    title: "Product Manager",
    company: "Northstar",
    initials: "n",
    color: "peach",
    location: "Toronto, ON",
    remote: "Hybrid",
    salaryMin: 105000,
    salaryMax: 140000,
    score: 89,
    tags: ["Product strategy", "Analytics", "Agile"],
    explanation:
      "This example illustrates alignment with roadmap planning, stakeholder collaboration, and data-informed decisions.",
    gap: "Experience with B2B SaaS would strengthen this example profile.",
    posted: "1 day ago",
    description:
      "Own the roadmap for a new analytics experience. Bring customer insight and commercial thinking together to help teams make better decisions.",
  },
  {
    id: 3,
    title: "Digital Business Analyst",
    company: "Meridian",
    initials: "m",
    color: "mint",
    location: "Vancouver, BC",
    remote: "Remote",
    salaryMin: 85000,
    salaryMax: 115000,
    score: 87,
    tags: ["Requirements", "SQL", "Stakeholders"],
    explanation:
      "This example connects requirements gathering, digital analytics, and cross-functional delivery to the role.",
    gap: "The sample posting prefers familiarity with SQL reporting.",
    posted: "3 days ago",
    description:
      "Turn business needs into thoughtful digital experiences. Work with product and engineering to improve customer journeys and measure their impact.",
  },
  {
    id: 4,
    title: "UX Researcher",
    company: "Layers",
    initials: "L",
    color: "blue",
    location: "Montreal, QC",
    remote: "Remote",
    salaryMin: 90000,
    salaryMax: 125000,
    score: 82,
    tags: ["User research", "Usability", "Insights"],
    explanation:
      "This example shows how qualitative research and customer discovery could align with a research-focused position.",
    gap: "The sample posting asks for a portfolio of mixed-method research.",
    posted: "4 days ago",
    description:
      "Build a deeper understanding of the people behind the product. Plan studies, synthesize findings, and bring customer voices into everyday decisions.",
  },
  {
    id: 5,
    title: "Product Operations Specialist",
    company: "Orbit",
    initials: "O",
    color: "pink",
    location: "Calgary, AB",
    remote: "On-site",
    salaryMin: 75000,
    salaryMax: 100000,
    score: 78,
    tags: ["Operations", "Processes", "Collaboration"],
    explanation:
      "This example emphasizes process improvement and coordinating delivery across teams.",
    gap: "The sample role includes operational reporting responsibilities.",
    posted: "5 days ago",
    description:
      "Create the systems that help a product organization do its best work. Improve planning rituals, documentation, and feedback loops.",
  },
];
export const defaultPreferences: Preferences = {
  role: "",
  location: "",
  remote: "Any arrangement",
  salary: 0,
};
export function filterJobs(items: Job[], preferences: Preferences) {
  return items
    .filter(
      (job) =>
        job.title
          .toLowerCase()
          .includes(preferences.role.trim().toLowerCase()) &&
        job.location
          .toLowerCase()
          .includes(preferences.location.trim().toLowerCase()) &&
        (preferences.remote === "Any arrangement" ||
          job.remote === preferences.remote) &&
        job.salaryMax >= preferences.salary,
    )
    .sort((a, b) => b.score - a.score);
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
