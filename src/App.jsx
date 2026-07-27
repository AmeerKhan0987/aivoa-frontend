import ComplaintForm from './components/ComplaintForm'
import AIIntakeAssistant from './components/AIIntakeAssistant'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-2 gap-6 items-start">
        <ComplaintForm />
        <AIIntakeAssistant />
      </div>
    </div>
  )
}
