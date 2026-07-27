import axios from 'axios'

const client = axios.create({ baseURL: '/api', timeout: 20000 })

// Set to false once the FastAPI + LangGraph backend is running and reachable.
const USE_MOCK_FALLBACK = true

function mockDelay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Simulates what the backend's document-extraction agent returns after
// OCR/parsing a complaint PDF, DOCX, or email.
async function mockExtract() {
  await mockDelay(1400)
  return {
    complaintSource: 'Pharmacy',
    customerName: 'Apollo Pharmacy',
    productName: 'Amoxicillin Capsules',
    productStrength: '500 mg',
    batchNumber: 'AMX240602',
    manufacturingDate: '2026-03-01',
    expiryDate: '2028-02-01',
    quantityAffected: '12 capsules',
    complaintType: 'Product Quality',
    complaintDate: new Date().toISOString().slice(0, 10),
    description:
      'Apollo Pharmacy reported 12 discolored capsules in a sealed bottle. Requesting investigation and replacement.',
    initialSeverity: 'Major',
    priority: 'High',
  }
}

// Simulates the AI assistant interpreting a free-text correction, e.g.
// "ah sorry the batch number is BMX240602 and affected quantity is 48 capsules"
async function mockChat(text, currentForm) {
  await mockDelay(900)
  const updatedFields = {}
  const batchMatch = text.match(/batch\s*(number)?\s*is\s*([A-Za-z0-9\-\s]+?)(?:\s+and|\.|$)/i)
  const qtyMatch = text.match(/(?:affected\s*)?quantity\s*is\s*([A-Za-z0-9()\s\/]+?)(?:\.|$)/i)

  if (batchMatch) updatedFields.batchNumber = batchMatch[2].trim()
  if (qtyMatch) updatedFields.quantityAffected = qtyMatch[1].trim()

  if (Object.keys(updatedFields).length === 0) {
    return {
      reply: "Got it — I've noted that, but I couldn't map it to a specific field automatically. Feel free to edit the field directly.",
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
    if (USE_MOCK_FALLBACK) return mockExtract()
    throw err
  }
}

export async function extractComplaintFromText(text) {
  try {
    const { data } = await client.post('/complaints/extract-text', { text })
    return data
  } catch (err) {
    if (USE_MOCK_FALLBACK) return mockExtract()
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
