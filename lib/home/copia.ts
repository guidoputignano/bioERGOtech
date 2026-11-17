/**
 * The words of the homepage that tell who the Foundation is: the kicker
 * above the headline, the vision ("why a foundation") and the story.
 *
 * Every fact here is sourced in the repository: the founding as an ETS on
 * 12 April 2025 (app/articles/newsletter-june-2026), the Taranto Biotech
 * Days 2024 and the first BioShot (the archived articles under
 * bioERGOtech-saved-before/articles), the launch at Montecitorio on 28 and
 * 29 October 2025 (app/eventi/vivere-piu-a-lungo/universita/content.ts),
 * the first members on 31 May 2026 (app/articles), the calls and the event
 * (app/eventi). Change a fact there, change it here.
 */

export const COPIA = {
  heroKicker: "A non-profit foundation in Taranto, Italy",

  visionTitle: "Why a foundation, and why students",
  visionParagraphs: [
    "We believe students can do more than learn about science. They can build tools for it. A digital scientist is an AI agent that does part of a scientist's work: it reads, tests and explains, with a person always in charge. As a non-profit foundation, we train students to build them.",
    "At first, we also supported startups, through the BioShot competition and incubation. Along the way, we saw that our work with students created the most value. So we made a choice: we now put everything into students, from upper-secondary schools to universities.",
  ],
  commitments: [
    { title: "Free for students", text: "Programmes, the online course, the talks and our December event: everything we offer students is free." },
    { title: "The work stays theirs", text: "What students build in the Agentic AI course is theirs. The Foundation does not claim ownership of their projects." },
    { title: "Experts at their side", text: "Mentors from research and industry support the teams, and experts meet students in online talks." },
    { title: "A person decides", text: "The agents students build take on part of the work. The decisions always stay with a person." },
  ],

  storyTitle: "From the Taranto Biotech Days to students on stage",
  storyIntro:
    "It began with three days of biotech in Taranto. Each step since has brought us closer to the people we now serve first: students.",
  timeline: [
    {
      when: "October 2024",
      title: "Taranto Biotech Days",
      text: "Over 1,200 participants, with speakers from Stanford, ETH Zurich and EPFL. Hundreds of school students joined BioNext. At the first BioShot, 4 of 9 startups were awarded.",
    },
    {
      when: "April 2025",
      title: "The Foundation is established",
      text: "Fondazione bioERGOtech ETS is founded in Taranto on 12 April, as a non-profit participation foundation under the Italian Third Sector Code.",
    },
    {
      when: "October 2025",
      title: "The launch in Rome",
      text: "On 28 and 29 October, the Foundation is officially launched in the Sala della Regina at Palazzo Montecitorio, in Rome.",
    },
    {
      when: "May 2026",
      title: "The first members join",
      text: "Priver of Carosino (Taranto), in industrial systems since 1982, and Predict Healthcare of Bari, in imaging, become the first members.",
    },
    {
      when: "September 2026",
      title: "A call for university students",
      text: "The free programme “Biotecnologie e Intelligenza Artificiale” opens to university students, with SafesPro.",
    },
    {
      when: "Autumn 2026",
      title: "Free programmes for schools",
      text: "Students in Taranto and its province build team projects with mentors, alongside online talks and the Agentic AI course.",
    },
    {
      when: "December 2026",
      title: "Students on stage in Taranto",
      text: "On 10 and 11 December, the ten best school projects are presented at “Vivere più a lungo”. Free entry, registration required.",
    },
  ],
} as const;

/** The About page, aligned with the homepage. */
export const COPIA_ABOUT = {
  metaTitle: "About bioERGOtech | A Non-Profit Foundation for Students",
  metaDescription:
    "Fondazione bioERGOtech ETS is a non-profit foundation in Taranto, Italy. We train students to build digital scientists, and everything we offer them is free.",
  heroTitle: "A non-profit foundation that puts students first",
  heroIntro:
    "With us, students learn to build digital scientists: AI agents that take on part of a scientist's work, while a person stays in charge. Taking part is free. Fondazione bioERGOtech ETS is a non-profit foundation, established in Taranto in April 2025 under the Italian Third Sector Code.",
  howWeWorkLead:
    "As a non-profit foundation, we give students free training, guidance from experts and a stage for their best work.",
  howWeWorkBullets: [
    {
      title: "Programmes for students",
      text: "Free programmes for upper-secondary schools in Taranto and its province and for university students, plus the online Agentic AI High School Innovation Program.",
    },
    {
      title: "Mentors and a stage",
      text: "Mentors from research and industry support the teams. A committee of experts evaluates the projects, and the ten best are presented on stage in Taranto.",
    },
  ],
} as const;
