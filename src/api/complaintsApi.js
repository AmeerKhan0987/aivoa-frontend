import axios from 'axios'
import { parseComplaintText, looksLikeFullIntake } from '../utils/complaintParser'

const client = axios.create({ baseURL: '/api', timeout: 20000 })const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 20000,
})

// Set to false once the FastAPI + LangGraph backend is running and reachable.
const USE_MOCK_FALLBACK = false

function mockDelay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Best-effort: read a dropped/selected file as text. Works natively for
// .txt/.eml. For .pdf we lazy-load pdfjs-dist if it's installed; if it
// isn't (e.g. no network to `npm install` yet), we fall back to asking the
// user to paste the text instead of silently returning fake data.
async function readFileAsText(file) {
  const lower = file.name.toLowerCase()

  if (lower.endsWith('.txt') || lower.endsWith('.eml')) {
    return await file.text()
  }

  if (lower.endsWith('.pdf')) {
    try {
      const pdfjsLib = await import('pdfjs-dist/build/pdf')
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString()
      const buf = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise
      let text = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        text += content.items.map((it) => it.str).join(' ') + '\n'
      }
      return text
    } catch {
      return null // pdfjs-dist not installed / failed to parse
    }
  }

  // .docx and anything else: no client-side parser available offline.
  return null
}

// Local fallback extraction: parses whatever text we could actually read
// from the file/paste, instead of returning hardcoded sample data.
async function mockExtract(rawText) {
  await mockDelay(900)
  if (!rawText || !rawText.trim()) {
    throw new Error(
      "Couldn't read this file offline (no backend connection and no local parser for this format). Try pasting the text instead, or connect the FastAPI backend."
    )
  }
  const fields = parseComplaintText(rawText)
  return { complaintDate: new Date().toISOString().slice(0, 10), ...fields }
}

// Simulates the AI assistant interpreting a free-text message. If the
// message looks like a full complaint report (several new fields), extract
// everything, same as the paste/upload flow. Otherwise treat it as a
// narrow correction like "batch number is X".
async function mockChat(text, currentForm) {
  await mockDelay(700)
  const parsed = parseComplaintText(text)

  if (looksLikeFullIntake(parsed)) {
    // Only fill fields that are currently empty, don't clobber user edits.
    const updatedFields = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (v && !currentForm?.[k]) updatedFields[k] = v
    }
    if (Object.keys(updatedFields).length > 0) {
      const parts = Object.keys(updatedFields)
      return {
        reply: `Got it — I've extracted and filled ${parts.length} field${parts.length > 1 ? 's' : ''} from that (${parts.join(', ')}).`,
        updatedFields,
      }
    }
  }

  // Narrow correction phrasing: "batch number is X", "quantity is Y"
  const updatedFields = {}
  const batchMatch = text.match(/batch\s*(number)?\s*is\s*([A-Za-z0-9\-\s]+?)(?:\s+and|\.|$)/i)
  const qtyMatch = text.match(/(?:affected\s*)?quantity\s*is\s*([A-Za-z0-9()\s\/]+?)(?:\.|$)/i)
  if (batchMatch) updatedFields.batchNumber = batchMatch[2].trim()
  if (qtyMatch) updatedFields.quantityAffected = qtyMatch[1].trim()

  if (Object.keys(updatedFields).length === 0) {
    return {
      reply: "Got it — I've noted that, but I couldn't map it to a specific field automatically. Feel free to edit the field directly, or use the \"Paste Complaint Text\" box above for full complaint reports.",
      updatedFields: {},
    }
  }

  const parts = Object.entries(updatedFields).map(([k, v]) => `${k} to "${v}"`)
  return {
    reply: `Got it. I've updated the ${parts.join(' and ')} in the form.`,
    updatedFields,
  }
}

export async function extractComplaintFromDocument(file) {
  const formData = new FormData()
  formData.append('file', file)
  try {
    const { data } = await client.post('/complaints/extract', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  } catch (err) {
    if (USE_MOCK_FALLBACK) {
      const text = await readFileAsText(file)
      return mockExtract(text)
    }
    throw err
  }
}

export async function extractComplaintFromText(text) {
  try {
    const { data } = await client.post('/complaints/extract-text', { text })
    return data
  } catch (err) {
    if (USE_MOCK_FALLBACK) return mockExtract(text)
    throw err
  }
}

export async function sendAssistantMessage(text, currentForm) {
  try {
    const { data } = await client.post('/complaints/chat', { message: text, form: currentForm })
    return data
  } catch (err) {
    if (USE_MOCK_FALLBACK) return mockChat(text, currentForm)
    throw err
  }
}

export async function submitComplaint(form) {
  try {
    const { data } = await client.post('/complaints', form)
    return data
  } catch (err) {
    if (USE_MOCK_FALLBACK) {
      await mockDelay(600)
      return { id: `CMP-${Date.now()}`, ...form, risk_level: 'Medium', logged_at: new Date().toISOString() }
    }
    throw err
  }
}
