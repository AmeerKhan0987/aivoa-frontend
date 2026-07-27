import { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { UploadCloud, FileText, Info, Sparkles, Send, Bot, User } from 'lucide-react'
import { extractFromDocument, extractFromPastedText, sendChatMessage } from '../store/complaintsSlice'

export default function AIIntakeAssistant() {
  const dispatch = useDispatch()
  const inputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showPaste, setShowPaste] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [chatInput, setChatInput] = useState('')

  const { extractionStatus, extractionProgress, messages, chatStatus } = useSelector((s) => s.complaints)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatStatus])

  const handleFile = (file) => {
    if (!file) return
    setShowPaste(false)
    dispatch(extractFromDocument(file))
  }

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) return
    dispatch(extractFromPastedText(pasteText.trim()))
    setPasteText('')
    setShowPaste(false)
  }

  const handleChatSubmit = () => {
    if (!chatInput.trim()) return
    dispatch(sendChatMessage(chatInput.trim()))
    setChatInput('')
  }

  const isBusy = extractionStatus === 'loading'

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={17} className="text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900">AI Complaint Intake Assistant</h2>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">BETA</span>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files?.[0]) }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed py-6 flex flex-col items-center justify-center text-center transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300 hover:bg-slate-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,.eml"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <UploadCloud size={22} className="text-slate-400 mb-2" />
        <p className="text-sm text-slate-600">Drag &amp; drop complaint document here</p>
        <p className="text-sm mt-0.5">
          or <span className="text-blue-600 font-medium">click to browse</span>
        </p>
      </div>

      <div className="flex items-center gap-3 my-3">
        <div className="h-px bg-slate-200 flex-1" />
        <span className="text-[11px] font-semibold text-slate-400">OR</span>
        <div className="h-px bg-slate-200 flex-1" />
      </div>

      <button
        onClick={() => setShowPaste((v) => !v)}
        className="flex items-center justify-center gap-2 w-full rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <FileText size={15} /> Paste Complaint Text / Email
      </button>

      {showPaste && (
        <div className="mt-3 space-y-2">
          <textarea
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Paste the complaint email or text here..."
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <button
            onClick={handlePasteSubmit}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Extract from text
          </button>
        </div>
      )}

      <div className="flex items-start gap-2 mt-3 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2.5">
        <Info size={14} className="text-emerald-600 mt-0.5 shrink-0" />
        <p className="text-xs text-emerald-700 leading-relaxed">
          Supported formats: PDF, DOCX, TXT, EML
          <br />
          Max file size: 10MB
        </p>
      </div>

      {isBusy && (
        <div className="mt-4">
          <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">
            Extraction Progress
          </p>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-500"
              style={{ width: `${extractionProgress}%` }}
            />
          </div>
          <p className="text-xs text-slate-600 mt-2">Analyzing document content and extracting key details...</p>
          <p className="text-xs text-slate-400">Please wait, this may take a few moments.</p>
        </div>
      )}

      <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mt-5 mb-2">AI Assistant</p>

      <div className="flex-1 min-h-[120px] max-h-72 overflow-y-auto space-y-3 pr-1">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                m.role === 'user' ? 'bg-slate-200' : 'bg-blue-600'
              }`}
            >
              {m.role === 'user' ? <User size={13} className="text-slate-600" /> : <Bot size={13} className="text-white" />}
            </div>
            <div
              className={`text-xs rounded-xl px-3 py-2 leading-relaxed max-w-[85%] ${
                m.role === 'user' ? 'bg-slate-800 text-white' : 'bg-blue-50 text-slate-700'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {chatStatus === 'loading' && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <Bot size={13} className="text-white" />
            </div>
            <div className="text-xs rounded-xl px-3 py-2 bg-blue-50 text-slate-400">Thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
        <input
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ask me anything about this complaint..."
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
        />
        <button
          onClick={handleChatSubmit}
          className="w-9 h-9 shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center justify-center"
        >
          <Send size={15} className="text-white" />
        </button>
      </div>
    </div>
  )
}
