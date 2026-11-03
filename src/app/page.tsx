import EventCreationForm from '@/components/EventCreationForm';
import { Calendar, Users, Flame, ShieldCheck } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-indigo-50/20 to-slate-50 text-slate-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-lg">HorarioGrupal</span>
              <span className="text-xs text-indigo-600 font-medium ml-2 px-2 py-0.5 bg-indigo-50 rounded-full">Beta</span>
            </div>
          </div>
          <a
            href="https://github.com/Antholl73/disponibilidad_horarios"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
          >
            GitHub
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 text-center">
        {/* Hero Tagline */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-semibold mb-4">
            <Flame className="w-3.5 h-3.5 text-indigo-600" /> Coordinación de Horarios Inteligente
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4 leading-tight">
            Encuentra el horario donde <span className="text-indigo-600">todos puedan</span>.
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Crea una sala de reunión, comparte el enlace con tu grupo y visualiza automáticamente la disponibilidad común mediante un mapa de calor visual.
          </p>
        </div>

        {/* Creation Form */}
        <EventCreationForm />

        {/* Feature Pills */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-4xl mx-auto">
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Sin registros forzosos</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Cada integrante de tu grupo entra con su nombre y marca sus horas libres en segundos.
            </p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <Flame className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Mapa de calor grupal</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Diferencia con precisión cuándo hay más personas libres (ej. 4 de 5) versus cuándo falta alguien.
            </p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Enlace único y directo</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Copia la URL única del evento y compártela directamente en WhatsApp, Telegram o Slack.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 py-6 text-center text-xs text-slate-500 bg-white">
        Disponibilidad de Horarios • Proyecto de código abierto
      </footer>
    </div>
  );
}
