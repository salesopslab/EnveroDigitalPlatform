// ============================================================
// PUBLIC CONTENT PAGE
// The missing link in the loop: renders a published content_item
// at a real, public, indexable URL and captures leads via the
// existing /api/leads endpoint.
//
// Route: /p/[subdomain]/[slug]
//   e.g. /p/nationalcardeals/2026-kia-telluride-deals-phoenix
//
// Data is fetched server-side with supabaseAdmin (service role),
// same pattern as /api/leads — this is a public route, so nothing
// here relies on RLS or the visitor being signed in. Only PUBLIC-
// SAFE fields are ever passed into props; nothing sensitive
// (stripe ids, competitors, personas, etc.) is fetched or forwarded.
// ============================================================

import Head from 'next/head'
import { useState } from 'react'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { fetchJson } from '../../../lib/fetchJson'

// Fields every lead form always asks for, regardless of vertical.
const BASE_FIELDS = ['name', 'email', 'phone']

// Maps a vertical playbook's extra lead_fields (e.g. "zip", "make",
// "model", "purchase_timeframe") to a human label. Anything not
// listed here falls back to a title-cased version of the field key.
const FIELD_LABELS = {
  zip: 'ZIP code',
  make: 'Make',
  model: 'Model',
  purchase_timeframe: 'When are you looking to buy?',
}

function labelFor(field) {
  return FIELD_LABELS[field] || field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export async function getServerSideProps({ params }) {
  const { subdomain, slug } = params

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id, company_name, industry, subdomain')
    .eq('subdomain', subdomain)
    .single()

  if (!client) return { notFound: true }

  const { data: content } = await supabaseAdmin
    .from('content_items')
    .select('id, title, slug, meta_description, body, content_type, published_at')
    .eq('client_id', client.id)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!content) return { notFound: true }

  let extraFields = []
  if (client.industry) {
    const { data: playbook } = await supabaseAdmin
      .from('vertical_playbooks')
      .select('lead_fields, cta_label')
      .eq('industry', client.industry)
      .single()
    if (playbook) {
      extraFields = (playbook.lead_fields || []).filter((f) => !BASE_FIELDS.includes(f))
      content.ctaLabel = playbook.cta_label || null
    }
  }

  return {
    props: {
      client: { id: client.id, companyName: client.company_name },
      content,
      extraFields,
    },
  }
}

export default function PublicContentPage({ client, content, extraFields }) {
  const [form, setForm] = useState({})
  const [status, setStatus] = useState('idle') // idle | submitting | done | error
  const [errorMsg, setErrorMsg] = useState('')

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email) return
    setStatus('submitting')
    setErrorMsg('')

    const params = new URLSearchParams(window.location.search)

    try {
      await fetchJson('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          contentItemId: content.id,
          name: form.name || null,
          email: form.email,
          phone: form.phone || null,
          // Fold any extra vertical-specific fields (make, model, zip, etc.)
          // into productService / location so they show up on the existing
          // Lead Center table without needing new columns yet.
          productService: [form.make, form.model].filter(Boolean).join(' ') || null,
          location: form.zip || null,
          sourceUrl: window.location.href,
          utmSource: params.get('utm_source') || null,
          utmCampaign: params.get('utm_campaign') || null,
          utmContent: params.get('utm_content') || null,
        }),
      })
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message)
    }
  }

  const body = content.body || {}

  return (
    <>
      <Head>
        <title>{content.title || client.companyName}</title>
        <meta name="description" content={content.meta_description || ''} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="container" style={{ maxWidth: 780, paddingTop: 48, paddingBottom: 64 }}>
        <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 8 }}>{client.companyName}</p>
        <h1 style={{ fontSize: 30, marginBottom: 12 }}>{content.title}</h1>
        {content.meta_description && (
          <p style={{ color: '#374151', fontSize: 16, marginBottom: 28 }}>{content.meta_description}</p>
        )}

        {(body.sections || []).map((s, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            {s.heading && <h2 style={{ fontSize: 20, marginBottom: 6 }}>{s.heading}</h2>}
            <p style={{ color: '#374151', lineHeight: 1.6 }}>{s.text}</p>
          </div>
        ))}

        {body.text && <p style={{ color: '#374151', lineHeight: 1.6, marginBottom: 20 }}>{body.text}</p>}

        {(body.faqs || []).length > 0 && (
          <div style={{ marginTop: 28, marginBottom: 28 }}>
            <h2 style={{ fontSize: 20, marginBottom: 12 }}>Frequently Asked Questions</h2>
            {body.faqs.map((f, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>{f.question}</p>
                <p style={{ color: '#6b7280' }}>{f.answer}</p>
              </div>
            ))}
          </div>
        )}

        <div className="card" id="lead-form" style={{ marginTop: 32, background: '#eef2ff', border: '1px solid #c7d2fe' }}>
          <h2 style={{ fontSize: 20, marginBottom: 4 }}>
            {content.ctaLabel || body.cta || 'Get in touch'}
          </h2>
          <p style={{ color: '#4b5563', fontSize: 14, marginBottom: 16 }}>
            Tell us a bit about what you're looking for and we'll follow up shortly.
          </p>

          {status === 'done' ? (
            <p style={{ fontWeight: 600, color: '#16a34a' }}>Thanks — we've got your info and will be in touch soon.</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <input
                required
                placeholder="Name"
                value={form.name || ''}
                onChange={(e) => setField('name', e.target.value)}
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={form.email || ''}
                onChange={(e) => setField('email', e.target.value)}
              />
              <input
                type="tel"
                placeholder="Phone"
                value={form.phone || ''}
                onChange={(e) => setField('phone', e.target.value)}
              />
              {extraFields.map((f) => (
                <input
                  key={f}
                  placeholder={labelFor(f)}
                  value={form[f] || ''}
                  onChange={(e) => setField(f, e.target.value)}
                />
              ))}

              {status === 'error' && (
                <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 8 }}>{errorMsg}</p>
              )}

              <button type="submit" className="btn btn-primary" disabled={status === 'submitting'} style={{ width: '100%' }}>
                {status === 'submitting' ? 'Sending…' : (content.ctaLabel || body.cta || 'Submit')}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
