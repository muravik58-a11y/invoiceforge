'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Eye, EyeOff, Pencil } from 'lucide-react'
import { upsertLegalPage } from '@/lib/actions/admin'
import type { LegalPageData } from '@/lib/actions/admin'

interface Props {
  initialPages: LegalPageData[]
}

export function LegalPagesManager({ initialPages }: Props) {
  const [pages, setPages] = useState(initialPages)
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editPublished, setEditPublished] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function startEditing(page: LegalPageData) {
    setEditingSlug(page.slug)
    setEditTitle(page.title)
    setEditContent(page.content)
    setEditPublished(page.isPublished)
    setError(null)
    setSaved(false)
  }

  function handleSave() {
    if (!editingSlug) return
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        await upsertLegalPage({
          slug: editingSlug,
          title: editTitle,
          content: editContent,
          isPublished: editPublished,
        })
        setPages((prev) =>
          prev.map((p) =>
            p.slug === editingSlug
              ? { ...p, title: editTitle, content: editContent, isPublished: editPublished }
              : p,
          ),
        )
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } catch {
        setError('Save failed — check server logs.')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Page list */}
      {pages.map((page) => (
        <div
          key={page.slug}
          className="rounded-xl border border-gray-800 bg-gray-950"
        >
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">{page.title}</h3>
                <p className="text-xs text-gray-500">
                  /{page.slug} · {page.isPublished ? 'Published' : 'Draft'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {page.isPublished ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-400">
                  <EyeOff className="h-3 w-3" /> Published
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-400">
                  <Eye className="h-3 w-3" /> Draft
                </span>
              )}
              <button
                onClick={() => startEditing(page)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-gray-600 hover:text-white"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
            </div>
          </div>

          {/* Editor */}
          {editingSlug === page.slug && (
            <div className="border-t border-gray-800 p-5 space-y-4">
              <div>
                <label htmlFor={`title-${page.slug}`} className="mb-1.5 block text-sm font-medium text-gray-300">
                  Page title
                </label>
                <input
                  id={`title-${page.slug}`}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div>
                <label htmlFor={`content-${page.slug}`} className="mb-1.5 block text-sm font-medium text-gray-300">
                  Content (HTML)
                </label>
                <textarea
                  id={`content-${page.slug}`}
                  rows={12}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-mono"
                />
                <p className="mt-1.5 text-xs text-gray-600">
                  Supports HTML. Use &lt;h2&gt;, &lt;h3&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt; tags.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editPublished}
                    onChange={(e) => setEditPublished(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-300">Published (visible to public)</span>
                </label>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSave}
                    disabled={isPending}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                  >
                    {isPending ? 'Saving…' : 'Save changes'}
                  </button>
                  {saved && (
                    <span className="flex items-center gap-1.5 text-sm text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Saved
                    </span>
                  )}
                  {error && <span className="text-sm text-red-400">{error}</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}