import { useDispatch, useSelector } from 'react-redux'
import { updateField, submitComplaintThunk, resetForm } from '../store/complaintsSlice'
import { RotateCcw, Save, Calendar } from 'lucide-react'

const complaintSources = ['Pharmacy', 'Hospital', 'Distributor', 'Patient', 'Email', 'Phone', 'Regulatory Authority']
const complaintTypes = ['Product Quality', 'Packaging Defect', 'Adverse Event', 'Labeling Issue', 'Delivery / Logistics', 'Foreign Matter Contamination']
const severities = ['Critical', 'Major', 'Minor']
const priorities = ['Urgent', 'High', 'Medium', 'Low']

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</span>
      {children}
    </label>
  )
}

function SectionTitle({ number, children }) {
  return (
    <h3 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-3">
      {number}. {children}
    </h3>
  )
}

const statusStyles = {
  'Pending Triage': 'bg-amber-50 text-amber-700 border-amber-200',
  'Ready to Commit': 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

export default function ComplaintForm() {
  const dispatch = useDispatch()
  const { form, status, submitStatus } = useSelector((s) => s.complaints)

  const set = (field) => (e) => dispatch(updateField({ field, value: e.target.value }))

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Log Customer Complaint</h1>
          <p className="text-xs text-slate-500 mt-0.5">API &amp; FDF Quality Assurance Module</p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${statusStyles[status]}`}>
          {status}
        </span>
      </div>

      <div className="space-y-7">
        <section>
          <SectionTitle number={1}>Origin &amp; Customer Details</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Complaint Source">
              <select className={inputClass} value={form.complaintSource} onChange={set('complaintSource')}>
                <option value="">Awaiting AI extraction...</option>
                {complaintSources.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Customer Name">
              <input className={inputClass} value={form.customerName} onChange={set('customerName')} placeholder="Awaiting AI extraction..." />
            </Field>
          </div>
        </section>

        <section>
          <SectionTitle number={2}>Product &amp; Batch Identification</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Product Name">
              <input className={inputClass} value={form.productName} onChange={set('productName')} placeholder="Awaiting AI extraction..." />
            </Field>
            <Field label="Product Strength/Grade">
              <input className={inputClass} value={form.productStrength} onChange={set('productStrength')} placeholder="Awaiting AI extraction..." />
            </Field>
            <Field label="Batch/Lot Number">
              <input className={inputClass} value={form.batchNumber} onChange={set('batchNumber')} placeholder="Awaiting AI extraction..." />
            </Field>
            <Field label="Manufacturing Date">
              <div className="relative">
                <input type="date" className={inputClass} value={form.manufacturingDate} onChange={set('manufacturingDate')} />
                <Calendar size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </Field>
            <Field label="Expiry Date">
              <div className="relative">
                <input type="date" className={inputClass} value={form.expiryDate} onChange={set('expiryDate')} />
                <Calendar size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </Field>
            <Field label="Quantity Affected">
              <div className="relative">
                <input className={inputClass} value={form.quantityAffected} onChange={set('quantityAffected')} placeholder="Awaiting AI extraction..." />
              </div>
            </Field>
          </div>
        </section>

        <section>
          <SectionTitle number={3}>Complaint Details</SectionTitle>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Field label="Complaint Type">
              <select className={inputClass} value={form.complaintType} onChange={set('complaintType')}>
                <option value="">Awaiting AI extraction...</option>
                {complaintTypes.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Complaint Date">
              <div className="relative">
                <input type="date" className={inputClass} value={form.complaintDate} onChange={set('complaintDate')} />
                <Calendar size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </Field>
          </div>
          <Field label="Detailed Complaint Description">
            <textarea
              className={`${inputClass} min-h-24`}
              value={form.description}
              onChange={set('description')}
              placeholder="Awaiting AI extraction..."
            />
          </Field>
        </section>

        <section>
          <SectionTitle number={4}>Initial Assessment &amp; Priority</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Initial Severity">
              <select className={inputClass} value={form.initialSeverity} onChange={set('initialSeverity')}>
                <option value="">Awaiting AI extraction...</option>
                {severities.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select className={inputClass} value={form.priority} onChange={set('priority')}>
                <option value="">Awaiting AI extraction...</option>
                {priorities.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
          </div>
        </section>
      </div>

      <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
        <button
          onClick={() => dispatch(resetForm())}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <RotateCcw size={15} /> Reset Form
        </button>
        <button
          onClick={() => dispatch(submitComplaintThunk())}
          disabled={submitStatus === 'loading'}
          className="flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <Save size={15} /> {submitStatus === 'loading' ? 'Saving...' : 'Save Complaint'}
        </button>
      </div>
    </div>
  )
}
