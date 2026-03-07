import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { articles, getArticleBySlug } from '@/data/articles'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) return {}
  return {
    title: article.title,
    description: article.description,
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.description,
      images: [article.image],
      publishedTime: article.date,
    },
    alternates: { canonical: `https://bioergotech.org/articles/${slug}` },
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) notFound()

  return (
    <article style={{ paddingTop: 80 }}>
      {/* Header */}
      <section className="bg-light-gray" style={{ padding: '80px 0 60px' }}>
        <div className="container mx-auto px-6" style={{ maxWidth: 860 }}>
          <div className="mb-4">
            <span
              className="text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
              style={{ background: 'rgba(19,214,176,.12)', color: 'var(--primary)' }}
            >
              {article.category}
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-gray-800 mb-4 leading-tight">{article.title}</h1>
          <p className="text-lg text-gray-600 mb-4">{article.description}</p>
          <p className="text-sm text-gray-400">
            <i className="fas fa-calendar mr-2" />
            {new Date(article.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </section>

      {/* Featured Image */}
      <div className="container mx-auto px-6 my-10" style={{ maxWidth: 860 }}>
        <div className="image-container rounded-xl overflow-hidden">
          <Image src={article.image} alt={article.title} width={860} height={480} className="w-full object-cover" style={{ maxHeight: 480 }} />
        </div>
      </div>

      {/* Content */}
      <section className="container mx-auto px-6 pb-20" style={{ maxWidth: 860 }}>
        <div className="text-lg text-gray-700 leading-relaxed">
          <p className="mb-6">{article.description}</p>
          <p className="mb-6 text-gray-500 italic">
            Full article content will be loaded here. This page is a dynamic route generated from article metadata.
          </p>
        </div>

        {/* Back link */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <Link href="/" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            <i className="fas fa-arrow-left mr-2" />
            Back to Home
          </Link>
        </div>
      </section>
    </article>
  )
}
