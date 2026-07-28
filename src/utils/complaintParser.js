// Local, offline heuristic parser used ONLY as a fallback when the real
// FastAPI + LangGraph backend (/complaints/extract, /complaints/extract-text,
// /complaints/chat) is unreachable. It is intentionally generic — it does
// NOT hardcode any specific complaint's data. This exists so the demo still
// behaves sensibly without a live Groq-backed API.

const SOURCES = ['Pharmacy', 'Hospital', 'Distributor', 'Patient', 'Email', 'Phone', 'Regulatory Authority']
const COMPLAINT_TYPES = [
  'Product Quality',
  'Packaging Defect',
  'Adverse Event',
  'Labeling Issue',
  'Delivery / Logistics',
  'Foreign Matter Contamination',
]

function toIsoDate(raw) {
  if (!raw) return null
  const cleaned = raw.trim()

  // "March 2026" / "Mar 2026" -> first of month
  const monthYear = cleaned.match(
    /^(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\.?\s+(\d{4})$/i
  )
  if (monthYear) {
    const d = new Date(`${monthYear[1]} 1, ${monthYear[8]}`)
    if (!isNaN(d)) return d.toISOString().slice(0, 10)
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (dmy) {
    const [, d, m, y] = dmy
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  const d = new Date(cleaned)
  if (!isNaN(d)) return d.toISOString().slice(0, 10)
  return null
}

export function parseComplaintText(text) {
  if (!text || !text.trim()) return {}
  const t = text.replace(/\s+/g, ' ').trim()
  const fields = {}

  // Complaint source: look for a known source word, preferring "reported by X"
  const sourceHit = SOURCES.find((s) => new RegExp(`\\b${s}\\b`, 'i').test(t))
  if (sourceHit) fields.complaintSource = sourceHit

  // Customer / reporting org name: "<Name> reported ..." or "<Name> Pharmacy"
  const reporterMatch = t.match(/^([A-Z][A-Za-z0-9&.\- ]{2,40}?)\s+(?:reported|has reported|informed|complained)/)
  if (reporterMatch) fields.customerName = reporterMatch[1].trim()

  // Product name + strength, e.g. "Amoxicillin Capsules 500 mg"
  const productMatch = t.match(
    /\b([A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+)*\s(?:Capsules|Tablets|Injection|Syrup|Suspension|Ointment|Cream|Drops))\s*(\d+\s?(?:mg|mcg|ml|g|IU))?/
  )
  if (productMatch) {
    fields.productName = productMatch[1].trim()
    if (productMatch[2]) fields.productStrength = productMatch[2].trim()
  }

  // Batch number
  const batchMatch = t.match(/batch\s*(?:number|no\.?)?\s*[:\-]?\s*([A-Za-z0-9\-]{4,20})/i)
  if (batchMatch) fields.batchNumber = batchMatch[1].trim()

  // Manufacturing date
  const mfgMatch = t.match(
    /manufactur(?:ing|ed)\s*date\s*[:\-]?\s*([A-Za-z]+\.?\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}-\d{2}-\d{2})/i
  )
  if (mfgMatch) {
    const iso = toIsoDate(mfgMatch[1])
    if (iso) fields.manufacturingDate = iso
  }

  // Expiry date
  const expMatch = t.match(
    /expir(?:y|ation)\s*date\s*[:\-]?\s*([A-Za-z]+\.?\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}-\d{2}-\d{2})/i
  )
  if (expMatch) {
    const iso = toIsoDate(expMatch[1])
    if (iso) fields.expiryDate = iso
  }

  // Quantity affected
  const qtyMatch = t.match(/(\d+\s?(?:capsules|tablets|units|kg|g|ml|l|bottles|strips|vials)\b[^.,]*)/i)
  if (qtyMatch) fields.quantityAffected = qtyMatch[1].trim()

  // Complaint type inference from keywords
  const lower = t.toLowerCase()
  if (/discolor|colour|color/.test(lower)) fields.complaintType = 'Product Quality'
  else if (/foreign (matter|particle|object)/.test(lower)) fields.complaintType = 'Foreign Matter Contamination'
  else if (/leak|torn|damaged pack|seal broken|packaging/.test(lower)) fields.complaintType = 'Packaging Defect'
  else if (/adverse|reaction|side effect|allerg/.test(lower)) fields.complaintType = 'Adverse Event'
  else if (/label|misprint|wrong text/.test(lower)) fields.complaintType = 'Labeling Issue'
  else if (/deliver|shipment|logistics|late arriv/.test(lower)) fields.complaintType = 'Delivery / Logistics'
  else {
    const typeHit = COMPLAINT_TYPES.find((c) => lower.includes(c.toLowerCase()))
    if (typeHit) fields.complaintType = typeHit
  }

  // Severity / priority inference
  if (/adverse|contamina|life[- ]threaten|critical/.test(lower)) {
    fields.initialSeverity = 'Critical'
    fields.priority = 'Urgent'
  } else if (/discolor|major|significant/.test(lower)) {
    fields.initialSeverity = 'Major'
    fields.priority = 'High'
  } else if (/cosmetic|minor|packaging/.test(lower)) {
    fields.initialSeverity = 'Minor'
    fields.priority = 'Medium'
  }

  // Description: use the raw text itself, trimmed to a reasonable length
  fields.description = t.length > 400 ? `${t.slice(0, 400)}…` : t

  return fields
}

// Returns true if the parsed result looks like a substantive complaint
// report (several distinct fields found) rather than a short one-line
// correction like "batch number is X".
export function looksLikeFullIntake(fields) {
  const meaningfulKeys = Object.keys(fields).filter((k) => k !== 'description')
  return meaningfulKeys.length >= 3
}
