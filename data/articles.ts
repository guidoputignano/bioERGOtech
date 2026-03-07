export interface Article {
  slug: string
  title: string
  description: string
  date: string
  image: string
  category: string
}

export const articles: Article[] = [
  {
    slug: 'news-genogra-preseed-2026',
    title: 'Genogra Closes Pre-Seed Round',
    description: 'bioERGOtech portfolio company Genogra closes its pre-seed funding round to advance genomic diagnostics.',
    date: '2026-01-15',
    image: '/assets/images/Home/News/product_pitch.webp',
    category: 'Portfolio News',
  },
  {
    slug: 'news-interview-guido-putignano-2025',
    title: 'Interview: Guido Putignano on the Future of Biotech',
    description: 'bioERGOtech CEO Guido Putignano discusses the foundation\'s vision, synthetic biology, and the road ahead.',
    date: '2025-09-10',
    image: '/assets/images/Home/News/Guido_Walter.webp',
    category: 'Interview',
  },
  {
    slug: 'news-alessia-soru-2025',
    title: 'Alessia Soru Joins bioERGOtech as Scientific Advisor',
    description: 'bioERGOtech welcomes Alessia Soru to its scientific advisory board, strengthening its expertise in cell therapies.',
    date: '2025-05-20',
    image: '/assets/images/Home/News/Alessia.webp',
    category: 'Team',
  },
  {
    slug: 'news-lorenzo-tarricone-2025',
    title: 'Lorenzo Tarricone Joins as Advisor',
    description: 'bioERGOtech welcomes Lorenzo Tarricone to its advisory board, bringing deep healthcare economics expertise.',
    date: '2025-03-08',
    image: '/assets/images/Home/News/frassinettii.webp',
    category: 'Team',
  },
  {
    slug: 'news-project-to-product',
    title: 'From Project to Product: The bioERGOtech Methodology',
    description: 'How bioERGOtech turns foundational research projects into market-ready products through its unique acceleration model.',
    date: '2025-01-22',
    image: '/assets/images/Home/News/product_pitch.webp',
    category: 'Insights',
  },
  {
    slug: 'news-cell-therapies-2024',
    title: 'The State of Cell Therapies in 2024',
    description: 'An overview of the cell therapy landscape and what the latest clinical advances mean for patients.',
    date: '2024-11-14',
    image: '/assets/images/Home/News/News_celltherapies.webp',
    category: 'Science',
  },
  {
    slug: 'news-bioshot-2024',
    title: 'Taranto Biotech Days: BioShot Competition',
    description: 'Relive the BioShot biotech startup competition at Taranto Biotech Days 2024 — where innovative projects competed for recognition.',
    date: '2024-10-13',
    image: '/assets/images/Home/News/TBD_summary.webp',
    category: 'Event',
  },
  {
    slug: 'launch-event',
    title: 'bioERGOtech Foundation Launch Event',
    description: 'The official launch of the bioERGOtech Foundation — marking the beginning of a new chapter in Engineered Living Systems.',
    date: '2024-06-01',
    image: '/assets/images/Home/lab_team.webp',
    category: 'Event',
  },
]

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug)
}
