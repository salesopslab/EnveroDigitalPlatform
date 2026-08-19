// ============================================================
// BUSINESS BRAIN — onboarding wizard + editable profile
// First stop after signup. Also reachable from the nav later to
// review/edit the same profile.
// ============================================================

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import AppShell from '../components/AppShell'
import { useRequireSession } from '../lib/useSession'

const BRAND_VOICES = ['professional', 'friendly', 'educational', 'direct', 'premium', 'casual']
const CONVERSION_GOALS = [
  'Generate lead', 'Get quote', 'Book appointment', 'Phone call',
  'Request consultation', 'Request pricing', 'Find inventory', 'Buy online',
]

function listToText(arr) { return Array.isArray(arr) ? arr.join(', ') : '' }
function textToList(text) { return text.split(',').map((s) => s.trim()).filter(Boolean) }

const emptyForm = {
  company_name: '', website: '', industry: '', description: '',
  locations: '', service_areas: '', products: '', services: '',
  ideal_customer: '', main_offer: '', conversion_goal: '', phone: '',
  approx_customer_value: '', competitors: '', social_channels: '',
  brand_voice: 'professional', custom_brand_instructions: '',
}

export default function BusinessBrain() {
  const router = useRouter()
  const { client, loading, reloadClient, session } = useRequireSession()
  const [form, setForm] = useState(emptyForm)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!client) return
    setForm({
      company_name: client.company_name || '',
      website: client.website || '',
      industry: client.industry || '',
      description: client.description || '',
      locations: listToText(client.locations),
      service_areas: listToText(client.service_areas),
      products: listToText(client.products),
      services: listToText(client.services),
      ideal_customer: client.ideal_customer || '',
      main_offer: client.main_offer || '',
      conversion_goal: client.conversion_goal || '',
      phone: client.phone || '',
      approx_customer_value: client.approx_customer_value || '',
      competitors: listToText(client.competitors),
      social_channels: listToText(client.social_channels),
      brand_voice: client.brand_voice || 'professional',
      custom_brand_instructions: client.custom_brand_instructions || '',
    })
  }, [client])

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function analyzeWebsite() {
    if (!form.website) { setMessage('Enter a website URL first.'); return }
    setAnalyzing(true)
    setMessage('')
    try {
      const res = await fetch('/api/analyze-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: form.website }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      const s = data.suggestions || {}
      setForm((f) => ({
        ...f,
        company_name: f.company_name || s.business_name || '',
        industry: f.industry || s.industry || '',
        description: f.description || s.description || '',
        products: f.products || listToText(s.products),
        services: f.services || listToText(s.services),
        locations: f.locations || listToText(s.locations),
        ideal_customer: f.ideal_customer || s.ideal_customer || '',
        main_offer: f.main_offer || s.main_offer || '',
      }))
      setMessage('Suggestions added below — review and edit before saving.')
    } catch (err) {
      setMessage(err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const { supabase } = await import('../lib/supabaseClient')
    const { error } = await supabase.from('clients').update({
      company_name: form.company_name,
      website: form.website,
      industry: form.industry,
      description: form.description,
      locations: textToList(form.locations),
      service_areas: textToList(form.service_areas),
      products: textToList(form.products),
      services: textToList(form.services),
      ideal_customer: form.ideal_customer,
      main_offer: form.main_offer,
      conversion_goal: form.conversion_goal,
      phone: form.phone,
      approx_customer_value: form.approx_customer_value ? Number(form.approx_customer_value) : null,
      competitors: textToList(form.competitors),
      social_channels: textToList(form.social_channels),
      brand_voice: form.brand_voice,
      custom_brand_instructions: form.custom_brand_instructions,
      onboarded: true,
    }).eq('id', session.user.id)

    setSaving(false)
    if (error) { setMessage(error.message); return }
    await reloadClient(session.user.id)
    router.push('/dashboard')
  }

  if (loading) return <div className="container" style={{ paddingTop: 80 }}>Loading...</div>

  const isFirstRun = !client?.onboarded

  return (
    <AppShell client={client} onLogout={async () => { const { supabase } = await import('../lib/supabaseClient'); await supabase.auth.signOut(); router.replace('/login') }}>
      <div style={{ maxWidth: 720 }}>
        <h1 style={{ fontSize: 26, marginBottom: 4 }}>
          {isFirstRun ? "Let's build your growth engine" : 'Business Brain'}
        </h1>
        <p style={{ color: '#6b7280', marginBottom: 28 }}>
          {isFirstRun
            ? "Tell us about your business — every piece of content Envero creates references this profile."
            : 'Edit your business profile. Changes apply to all future content.'}
        </p>

        <form onSubmit={save} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="field-label">Website URL</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={form.website} onChange={(e) => update('website', e.target.value)} placeholder="https://yourbusiness.com" style={{ marginBottom: 0 }} />
              <button type="button" className="btn btn-secondary" onClick={analyzeWebsite} disabled={analyzing} style={{ whiteSpace: 'nowrap' }}>
                {analyzing ? 'Analyzing…' : 'Analyze my website'}
              </button>
            </div>
          </div>

          {message && <p style={{ fontSize: 14, color: '#4f46e5' }}>{message}</p>}

          <Field label="Business name" value={form.company_name} onChange={(v) => update('company_name', v)} required />
          <Field label="Industry" value={form.industry} onChange={(v) => update('industry', v)} placeholder="automotive, home_services, insurance, legal, or your own" />
          <Field label="Description" textarea value={form.description} onChange={(v) => update('description', v)} />
          <Field label="Primary products/services" value={form.products} onChange={(v) => update('products', v)} placeholder="comma separated" />
          <Field label="Services" value={form.services} onChange={(v) => update('services', v)} placeholder="comma separated" />
          <Field label="Primary geographic markets" value={form.locations} onChange={(v) => update('locations', v)} placeholder="comma separated" />
          <Field label="Service areas" value={form.service_areas} onChange={(v) => update('service_areas', v)} placeholder="comma separated" />
          <Field label="Ideal customer" value={form.ideal_customer} onChange={(v) => update('ideal_customer', v)} />
          <Field label="Main offer" value={form.main_offer} onChange={(v) => update('main_offer', v)} />

          <div>
            <label className="field-label">Main conversion goal</label>
            <select value={form.conversion_goal} onChange={(e) => update('conversion_goal', e.target.value)}>
              <option value="">Select one</option>
              {CONVERSION_GOALS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <Field label="Phone number" value={form.phone} onChange={(v) => update('phone', v)} />
          <Field label="Approximate customer value ($)" value={form.approx_customer_value} onChange={(v) => update('approx_customer_value', v)} type="number" />
          <Field label="Primary competitors" value={form.competitors} onChange={(v) => update('competitors', v)} placeholder="comma separated" />
          <Field label="Current social channels" value={form.social_channels} onChange={(v) => update('social_channels', v)} placeholder="comma separated" />

          <div>
            <label className="field-label">Brand voice</label>
            <select value={form.brand_voice} onChange={(e) => update('brand_voice', e.target.value)}>
              {BRAND_VOICES.map((v) => <option key={v} value={v}>{v[0].toUpperCase() + v.slice(1)}</option>)}
            </select>
          </div>
          <Field label="Custom brand instructions" textarea value={form.custom_brand_instructions} onChange={(v) => update('custom_brand_instructions', v)} />

          <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: 8 }}>
            {saving ? 'Saving…' : isFirstRun ? 'Save & continue to dashboard' : 'Save changes'}
          </button>
        </form>
      </div>
    </AppShell>
  )
}

function Field({ label, value, onChange, textarea, required, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15, fontFamily: 'inherit' }}
        />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} style={{ marginBottom: 0 }} />
      )}
    </div>
  )
}
