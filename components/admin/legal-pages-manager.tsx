'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { upsertLegalPage, deleteLegalPage } from '@/lib/actions/admin'
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

  // New page creation state
  const [showCreate, setShowCreate] = useState(false)
  const [newSlug, setNewSlug] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newPublished, setNewPublished] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

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

  function handleCreate() {
    if (!newSlug.trim() || !newTitle.trim()) {
      setCreateError('Slug and title are required.')
      return
    }
    const slug = newSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
    if (pages.some((p) => p.slug === slug)) {
      setCreateError(`A page with slug "${slug}" already exists.`)
      return
    }
    setCreateError(null)
    startTransition(async () => {
      try {
        await upsertLegalPage({
          slug,
          title: newTitle.trim(),
          content: newContent || `<h2>Coming soon</h2><p>Content for ${newTitle.trim()} will appear here.</p>`,
          isPublished: newPublished,
        })
        setPages((prev) => [
          ...prev,
          {
            slug,
            title: newTitle.trim(),
            content: newContent || `<h2>Coming soon</h2><p>Content for ${newTitle.trim()} will appear here.</p>`,
            isPublished: newPublished,
          },
        ])
        setShowCreate(false)
        setNewSlug('')
        setNewTitle('')
        setNewContent('')
        setNewPublished(false)
      } catch {
        setCreateError('Create failed — check server logs.')
      }
    })
  }

  function handleDelete(slug: string) {
    if (!confirm(`Delete page "/${slug}"? This cannot be undone.`)) return
    startTransition(async () => {
      try {
        await deleteLegalPage(slug)
        setPages((prev) => prev.filter((p) => p.slug !== slug))
        if (editingSlug === slug) setEditingSlug(null)
      } catch {
        setError('Delete failed — check server logs.')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Create new page button */}
      {!showCreate && (
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-700 px-4 py-2.5 text-sm text-gray-400 transition-colors hover:border-gray-500 hover:text-gray-200"
        >
          <Plus className="h-4 w-4" />
          Create new page
        </button>
      )}

      {/* Create new page form */}
      {showCreate && (
        <div className="rounded-xl border border-gray-800 bg-gray-950 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">New Page</h3>
            <button
              onClick={() => { setShowCreate(false); setCreateError(null) }}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Cancel
            </button>
          </div>

          <div>
            <label htmlFor="new-slug" className="mb-1.5 block text-sm font-medium text-gray-300">
              URL slug
            </label>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <span>invoiceforge.co.uk/</span>
              <input
                id="new-slug"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="about"
                className="w-40 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-100 outline-none focus:border-red-500"
              />
            </div>
            <p className="mt-1 text-xs text-gray-600">Lowercase letters, numbers, and hyphens only.</p>
          </div>

          <div>
            <label htmlFor="new-title" className="mb-1.5 block text-sm font-medium text-gray-300">
              Page title
            </label>
            <input
              id="new-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="About Us"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label htmlFor="new-content" className="mb-1.5 block text-sm font-medium text-gray-300">
              Content (HTML)
            </label>
            <textarea
              id="new-content"
              rows={8}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="<h2>About Us</h2><p>Our story...</p>"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-mono"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newPublished}
                onChange={(e) => setNewPublished(e.target.checked)}
                className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-gray-300">Publish immediately</span>
            </label>

            <div className="flex items-center gap-3">
              <button
                onClick={handleCreate}
                disabled={isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {isPending ? 'Creating…' : 'Create page'}
              </button>
              {createError && <span className="text-sm text-red-400">{createError}</span>}
            </div>
          </div>
        </div>
      )}

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
              <button
                onClick={() => handleDelete(page.slug)}
                className="inline-flex items-center justify-center rounded-lg border border-gray-700 bg-gray-800 p-1.5 text-gray-500 transition-colors hover:border-red-800 hover:bg-red-900/30 hover:text-red-400"
                title="Delete page"
              >
                <Trash2 className="h-3.5 w-3.5" />
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