import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import {
  extractComplaintFromDocument,
  extractComplaintFromText,
  sendAssistantMessage,
  submitComplaint,
} from '../api/complaintsApi'

const emptyForm = {
  complaintSource: '',
  customerName: '',
  productName: '',
  productStrength: '',
  batchNumber: '',
  manufacturingDate: '',
  expiryDate: '',
  quantityAffected: '',
  complaintType: '',
  complaintDate: '',
  description: '',
  initialSeverity: '',
  priority: '',
}

// Thunk: send an uploaded PDF/DOCX/email to the backend extraction agent.
export const extractFromDocument = createAsyncThunk(
  'complaints/extractFromDocument',
  async (file, { dispatch }) => {
    dispatch(addMessage({ role: 'user', text: `Uploaded: ${file.name}` }))
    const extracted = await extractComplaintFromDocument(file)
    return extracted
  }
)

// Thunk: send pasted complaint text/email body to the same extraction agent.
export const extractFromPastedText = createAsyncThunk(
  'complaints/extractFromPastedText',
  async (text, { dispatch }) => {
    dispatch(addMessage({ role: 'user', text }))
    const extracted = await extractComplaintFromText(text)
    return extracted
  }
)

// Thunk: free-text chat with the AI assistant, e.g. corrections like
// "the batch number is actually X and quantity affected is Y kg".
export const sendChatMessage = createAsyncThunk(
  'complaints/sendChatMessage',
  async (text, { dispatch, getState }) => {
    dispatch(addMessage({ role: 'user', text }))
    const { form } = getState().complaints
    const { reply, updatedFields } = await sendAssistantMessage(text, form)
    return { reply, updatedFields }
  }
)

// Thunk: commit the complaint to the QMS ledger. The backend runs the
// risk-assessment agent server-side before storing it.
export const submitComplaintThunk = createAsyncThunk(
  'complaints/submitComplaint',
  async (_, { getState }) => {
    const { form } = getState().complaints
    const saved = await submitComplaint(form)
    return saved
  }
)

const initialState = {
  form: emptyForm,
  status: 'Pending Triage', // "Pending Triage" | "Ready to Commit"
  uploadedFileName: null,
  extractionStatus: 'idle', // idle | loading | succeeded | failed
  extractionProgress: 0,
  extractionError: null,
  messages: [
    {
      role: 'assistant',
      text: 'Upload a complaint document or paste text above. I will automatically extract the details and populate the form for you.',
    },
  ],
  chatStatus: 'idle',
  submitStatus: 'idle', // idle | loading | succeeded | failed
  submittedComplaints: [],
}

function isFormComplete(form) {
  const required = ['productName', 'batchNumber', 'description', 'complaintType', 'initialSeverity']
  return required.every((f) => Boolean(form[f]))
}

const complaintsSlice = createSlice({
  name: 'complaints',
  initialState,
  reducers: {
    updateField(state, action) {
      const { field, value } = action.payload
      state.form[field] = value
      state.status = isFormComplete(state.form) ? 'Ready to Commit' : 'Pending Triage'
    },
    resetForm() {
      return { ...initialState, form: { ...emptyForm } }
    },
    addMessage(state, action) {
      state.messages.push(action.payload)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(extractFromDocument.pending, (state, action) => {
        state.extractionStatus = 'loading'
        state.extractionProgress = 10
        state.extractionError = null
        state.uploadedFileName = action.meta.arg?.name ?? null
      })
      .addCase(extractFromDocument.fulfilled, (state, action) => {
        state.extractionStatus = 'succeeded'
        state.extractionProgress = 100
        state.form = { ...state.form, ...action.payload }
        state.status = isFormComplete(state.form) ? 'Ready to Commit' : 'Pending Triage'
        state.messages.push({
          role: 'assistant',
          text: `Complaint parsed successfully. I've extracted the product, batch, and complaint details from ${state.uploadedFileName} and populated the form.`,
        })
      })
      .addCase(extractFromDocument.rejected, (state, action) => {
        state.extractionStatus = 'failed'
        state.extractionError = action.error.message
        state.messages.push({ role: 'assistant', text: "I couldn't read that file. Try another PDF, DOCX, TXT, or EML." })
      })
      .addCase(extractFromPastedText.pending, (state) => {
        state.extractionStatus = 'loading'
        state.extractionProgress = 10
        state.extractionError = null
        state.uploadedFileName = 'pasted text'
      })
      .addCase(extractFromPastedText.fulfilled, (state, action) => {
        state.extractionStatus = 'succeeded'
        state.extractionProgress = 100
        state.form = { ...state.form, ...action.payload }
        state.status = isFormComplete(state.form) ? 'Ready to Commit' : 'Pending Triage'
        state.messages.push({
          role: 'assistant',
          text: "Complaint parsed successfully. I've extracted the details from your text and populated the form.",
        })
      })
      .addCase(extractFromPastedText.rejected, (state, action) => {
        state.extractionStatus = 'failed'
        state.extractionError = action.error.message
        state.messages.push({ role: 'assistant', text: "I couldn't parse that text. Try pasting the full complaint." })
      })
      .addCase(sendChatMessage.pending, (state) => {
        state.chatStatus = 'loading'
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.chatStatus = 'idle'
        state.form = { ...state.form, ...action.payload.updatedFields }
        state.status = isFormComplete(state.form) ? 'Ready to Commit' : 'Pending Triage'
        state.messages.push({ role: 'assistant', text: action.payload.reply })
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.chatStatus = 'idle'
        state.messages.push({ role: 'assistant', text: `Something went wrong: ${action.error.message}` })
      })
      .addCase(submitComplaintThunk.pending, (state) => {
        state.submitStatus = 'loading'
      })
      .addCase(submitComplaintThunk.fulfilled, (state, action) => {
        state.submitStatus = 'succeeded'
        state.submittedComplaints.push(action.payload)
        state.messages.push({ role: 'assistant', text: 'Complaint logged to the QMS ledger.' })
      })
      .addCase(submitComplaintThunk.rejected, (state, action) => {
        state.submitStatus = 'failed'
        state.messages.push({ role: 'assistant', text: `Couldn't save the complaint: ${action.error.message}` })
      })
  },
})

export const { updateField, resetForm, addMessage } = complaintsSlice.actions
export default complaintsSlice.reducer
