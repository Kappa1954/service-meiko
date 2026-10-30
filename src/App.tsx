import React, { useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { jsPDF } from 'jspdf';
import {
  BrowserRouter,
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';

type Role = 'SERVICE_MANAGER' | 'TECNICO';
type RequestStatus = 'RICEVUTA' | 'ASSEGNATA' | 'IN_INTERVENTO' | 'COMPLETATA' | 'CHIUSA';
type RequestPriority = 'BASSA' | 'MEDIA' | 'ALTA' | 'URGENTE';
type RequestType = 'MANUTENZIONE' | 'GUASTO' | 'INSTALLAZIONE' | 'PREVENTIVO';
type InterventionResult = 'RISOLTO' | 'NON_RISOLTO';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface Client {
  id: string;
  ragione_sociale: string;
  referente: string;
  telefono: string;
  email: string;
  indirizzo: string;
  note?: string;
  created_at: string;
}

interface Machine {
  id: string;
  cliente_id: string;
  matricola: string;
  modello: string;
  serial_number: string;
  ubicazione: string;
  installazione_data: string;
  garanzia_fine: string;
  note?: string;
  attiva: boolean;
  created_at: string;
}

interface RequestEvent {
  id: string;
  richiesta_id: string;
  tipo_evento: string;
  descrizione: string;
  created_at: string;
}

interface SparePart {
  id: string;
  codice_ricambio: string;
  descrizione: string;
  quantita: number;
}

interface WorkReport {
  id: string;
  richiesta_id: string;
  tecnico_id: string;
  descrizione_intervento: string;
  esito: InterventionResult;
  ore_funzionamento: number;
  numero_cicli: number;
  firma_tecnico?: string;
  firma_cliente?: string;
  ricambi: SparePart[];
  created_at: string;
}

interface Request {
  id: string;
  numero_richiesta: string;
  cliente_id: string;
  macchina_id: string;
  stato: RequestStatus;
  priorita: RequestPriority;
  tipo_richiesta: RequestType;
  problema_segnalato: string;
  assegnatario_id?: string;
  data_apertura: string;
  data_assegnazione?: string;
  data_inizio_intervento?: string;
  data_chiusura?: string;
  timeline: RequestEvent[];
  report?: WorkReport;
}

const techUsers: User[] = [
  { id: 'tech-1', name: 'Tecnico Test', email: 'tecnico@meiko.it', role: 'TECNICO' },
  { id: 'tech-2', name: 'Tecnico Nord', email: 'nord@meiko.it', role: 'TECNICO' },
  { id: 'tech-3', name: 'Tecnico Centro', email: 'centro@meiko.it', role: 'TECNICO' },
];

const demoUsers: User[] = [
  { id: 'manager-1', name: 'Manager Service', email: 'manager@meiko.it', role: 'SERVICE_MANAGER' },
  ...techUsers,
];

const demoClients: Client[] = [
  {
    id: 'client-1',
    ragione_sociale: 'Hotel Milano',
    referente: 'Marco Bianchi',
    telefono: '+39 02 1234567',
    email: 'service@hotelmilano.it',
    indirizzo: 'Via Torino 15, Milano',
    note: 'Contratto manutenzione annuale attivo.',
    created_at: '2024-01-15T09:00:00.000Z',
  },
  {
    id: 'client-2',
    ragione_sociale: 'Ristorante Como',
    referente: 'Giulia Rossi',
    telefono: '+39 031 9876543',
    email: 'operations@ristorantecomo.it',
    indirizzo: 'Piazza Cavour 8, Como',
    note: 'Richieste urgenti da cucina centrale.',
    created_at: '2024-02-02T10:15:00.000Z',
  },
  {
    id: 'client-3',
    ragione_sociale: 'Ospedale Lecco',
    referente: 'Andrea Verdi',
    telefono: '+39 0341 223344',
    email: 'maint@ospedalelecco.it',
    indirizzo: 'Via Roma 44, Lecco',
    note: 'Attenzione a stampati e documenti per audit.',
    created_at: '2024-03-01T08:00:00.000Z',
  },
];

const demoMachines: Machine[] = [
  {
    id: 'machine-1',
    cliente_id: 'client-1',
    matricola: 'MK100001',
    modello: 'M-IQ',
    serial_number: 'MEI-MIQ-001',
    ubicazione: 'Kitchen 1',
    installazione_data: '2023-06-15',
    garanzia_fine: '2028-06-15',
    note: 'Lavastoviglie ad alta capacità; manutenzione periodica semestrale.',
    attiva: true,
    created_at: '2023-06-15T09:00:00.000Z',
  },
  {
    id: 'machine-2',
    cliente_id: 'client-2',
    matricola: 'MK100002',
    modello: 'UPSTER H500',
    serial_number: 'MEI-H500-002',
    ubicazione: 'Cucina estiva',
    installazione_data: '2022-08-30',
    garanzia_fine: '2027-08-30',
    note: 'Da controllare il ciclo di risciacquo',
    attiva: true,
    created_at: '2022-08-30T12:30:00.000Z',
  },
  {
    id: 'machine-3',
    cliente_id: 'client-3',
    matricola: 'MK100003',
    modello: 'UPSTER U500',
    serial_number: 'MEI-U500-003',
    ubicazione: 'Piano 2',
    installazione_data: '2024-01-05',
    garanzia_fine: '2029-01-05',
    note: 'Installata in area stanze di isolamento',
    attiva: true,
    created_at: '2024-01-05T10:00:00.000Z',
  },
];

const demoRequests: Request[] = [
  {
    id: 'request-1',
    numero_richiesta: 'SR-2026-10001',
    cliente_id: 'client-1',
    macchina_id: 'machine-1',
    stato: 'ASSEGNATA',
    priorita: 'ALTA',
    tipo_richiesta: 'GUASTO',
    problema_segnalato: 'La macchina non completa il ciclo di risciacquo e presenta errore su display.',
    assegnatario_id: 'tech-1',
    data_apertura: '2026-10-20T09:15:00.000Z',
    data_assegnazione: '2026-10-20T10:00:00.000Z',
    timeline: [
      { id: 'ev-1', richiesta_id: 'request-1', tipo_evento: 'CREATA', descrizione: 'Richiesta ricevuta dal cliente.', created_at: '2026-10-20T09:15:00.000Z' },
      { id: 'ev-2', richiesta_id: 'request-1', tipo_evento: 'ASSEGNATA', descrizione: 'Richiesta assegnata a Tecnico Test.', created_at: '2026-10-20T10:00:00.000Z' },
    ],
    report: {
      id: 'report-1',
      richiesta_id: 'request-1',
      tecnico_id: 'tech-1',
      descrizione_intervento: 'Controllo del sistema di risciacquo, sostituito sensore e verificato il ciclo completo.',
      esito: 'RISOLTO',
      ore_funzionamento: 2.5,
      numero_cicli: 145,
      firma_tecnico: 'data:image/png;base64,stub-tech',
      firma_cliente: 'data:image/png;base64,stub-client',
      ricambi: [
        { id: 'sp-1', codice_ricambio: 'SEN-2201', descrizione: 'Sensore risciacquo', quantita: 1 },
        { id: 'sp-2', codice_ricambio: 'CAV-9900', descrizione: 'Cavo alimentazione', quantita: 1 },
      ],
      created_at: '2026-10-20T13:45:00.000Z',
    },
  },
  {
    id: 'request-2',
    numero_richiesta: 'SR-2026-10002',
    cliente_id: 'client-2',
    macchina_id: 'machine-2',
    stato: 'IN_INTERVENTO',
    priorita: 'URGENTE',
    tipo_richiesta: 'MANUTENZIONE',
    problema_segnalato: 'Il gruppo di risciacquo presenta perdita e la lavastoviglie si blocca in fase di asciugatura.',
    assegnatario_id: 'tech-2',
    data_apertura: '2026-10-26T08:20:00.000Z',
    data_assegnazione: '2026-10-26T09:10:00.000Z',
    data_inizio_intervento: '2026-10-26T12:00:00.000Z',
    timeline: [
      { id: 'ev-3', richiesta_id: 'request-2', tipo_evento: 'CREATA', descrizione: 'Richiesta ricevuta dal cliente.', created_at: '2026-10-26T08:20:00.000Z' },
      { id: 'ev-4', richiesta_id: 'request-2', tipo_evento: 'ASSEGNATA', descrizione: 'Richiesta assegnata a Tecnico Nord.', created_at: '2026-10-26T09:10:00.000Z' },
      { id: 'ev-5', richiesta_id: 'request-2', tipo_evento: 'IN_INTERVENTO', descrizione: 'Intervento iniziato in cantiere.', created_at: '2026-10-26T12:00:00.000Z' },
    ],
  },
  {
    id: 'request-3',
    numero_richiesta: 'SR-2026-10003',
    cliente_id: 'client-3',
    macchina_id: 'machine-3',
    stato: 'RICEVUTA',
    priorita: 'MEDIA',
    tipo_richiesta: 'PREVENTIVO',
    problema_segnalato: 'Verifica preventiva annuale del sistema di lavaggio e controllo del gruppo di riscaldamento.',
    data_apertura: '2026-10-28T15:00:00.000Z',
    timeline: [{ id: 'ev-6', richiesta_id: 'request-3', tipo_evento: 'CREATA', descrizione: 'Richiesta ricevuta dal cliente.', created_at: '2026-10-28T15:00:00.000Z' }],
  },
];

const statusClasses: Record<RequestStatus, string> = {
  RICEVUTA: 'bg-sky-100 text-sky-700',
  ASSEGNATA: 'bg-blue-100 text-blue-700',
  IN_INTERVENTO: 'bg-amber-100 text-amber-700',
  COMPLETATA: 'bg-emerald-100 text-emerald-700',
  CHIUSA: 'bg-slate-200 text-slate-700',
};

const priorityClasses: Record<RequestPriority, string> = {
  BASSA: 'bg-slate-100 text-slate-700',
  MEDIA: 'bg-amber-100 text-amber-700',
  ALTA: 'bg-orange-100 text-orange-700',
  URGENTE: 'bg-red-100 text-red-700',
};

const generateRequestNumber = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `SR-${year}-${random}`;
};

const downloadPdf = (request: Request, clientName: string, machineName: string, technicianName?: string) => {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.setTextColor(0, 90, 156);
  doc.text('Service Meiko - Rapporto Intervento', 14, 18);
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`Numero richiesta: ${request.numero_richiesta}`, 14, 32);
  doc.text(`Cliente: ${clientName}`, 14, 40);
  doc.text(`Macchina: ${machineName}`, 14, 48);
  doc.text(`Tecnico: ${technicianName ?? 'Non assegnato'}`, 14, 56);
  doc.text(`Stato: ${request.stato}`, 14, 64);
  doc.text(`Problema segnalato: ${request.problema_segnalato}`, 14, 76, { maxWidth: 180 });

  if (request.report) {
    doc.text('Descrizione intervento', 14, 110);
    doc.text(request.report.descrizione_intervento || 'Nessuna descrizione', 14, 118, { maxWidth: 180 });
    doc.text(`Esito: ${request.report.esito}`, 14, 150);
    doc.text(`Ore funzionamento: ${request.report.ore_funzionamento}`, 14, 158);
    doc.text(`Numero cicli: ${request.report.numero_cicli}`, 14, 166);

    if (request.report.ricambi.length) {
      doc.text('Ricambi utilizzati:', 14, 176);
      request.report.ricambi.forEach((part, index) => {
        doc.text(`${index + 1}. ${part.codice_ricambio} - ${part.descrizione} x${part.quantita}`, 18, 184 + index * 8, { maxWidth: 170 });
      });
    }
  }

  doc.save(`${request.numero_richiesta}.pdf`);
};

const AuthContext = React.createContext<{
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
} | null>(null);

function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function StatCard({ title, value, accent = 'blue' }: { title: string; value: number; accent?: 'blue' | 'yellow' | 'green' | 'slate' }) {
  const styles = {
    blue: 'bg-blue-50 text-blue-700',
    yellow: 'bg-amber-50 text-amber-700',
    green: 'bg-emerald-50 text-emerald-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="card p-4">
      <div className={`inline-flex rounded-lg px-2 py-1 text-xs font-semibold ${styles[accent]}`}>{title}</div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function Sidebar() {
  const { user, logout } = useAuth();
  const items = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/clients', label: 'Clienti' },
    { to: '/machines', label: 'Macchine' },
    { to: '/requests', label: 'Richieste' },
  ];

  return (
    <aside className="flex w-full flex-col justify-between border-r border-slate-200 bg-white p-4 lg:w-72">
      <div>
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-meiko-600 text-lg font-bold text-white">M</div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Service</p>
            <h1 className="text-xl font-bold text-slate-900">Meiko</h1>
          </div>
        </div>

        <nav className="space-y-2">
          {items.map(({ to, label }) => (
            <Link key={to} to={to} className="flex items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Utente</p>
        <p className="mt-1 font-semibold text-slate-800">{user?.name}</p>
        <p className="text-xs text-slate-500">{user?.role}</p>
        <button onClick={logout} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
          Logout
        </button>
      </div>
    </aside>
  );
}

function Layout() {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-slate-100 p-4 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function SignaturePad({ value, onChange }: { value?: string; onChange: (value: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';

    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = value;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [value]);

  const getCoords = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const point = getCoords(event);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    setIsDrawing(true);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const point = getCoords(event);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(false);
    onChange(canvas.toDataURL('image/png'));
  };

  const clearPad = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={420}
        height={180}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
        className="w-full rounded-xl border border-slate-200 bg-white"
      />
      <div className="flex justify-end">
        <button type="button" onClick={clearPad} className="btn-secondary">Cancella</button>
      </div>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const schema = z.object({
    email: z.string().email('Email non valida'),
    password: z.string().min(8, 'Password obbligatoria'),
  });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: 'manager@meiko.it', password: 'password123' },
  });

  const onSubmit = async (values: { email: string; password: string }) => {
    const ok = await login(values.email, values.password);
    if (ok) navigate('/dashboard');
    else form.setError('root', { message: 'Credenziali non valide' });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-sky-50 px-4">
      <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-8 shadow-soft">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-meiko-600 text-xl font-bold text-white">M</div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Service</p>
            <h1 className="text-2xl font-bold text-slate-900">Meiko</h1>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Accedi al pannello</h2>
        <p className="mt-2 text-sm text-slate-500">Gestisci richieste, interventi e ricambi in modo rapido.</p>

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <div>
            <label className="label">Email</label>
            <input className="input" {...form.register('email')} />
            {form.formState.errors.email && <p className="mt-1 text-xs text-red-600">{String(form.formState.errors.email.message)}</p>}
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" {...form.register('password')} />
            {form.formState.errors.password && <p className="mt-1 text-xs text-red-600">{String(form.formState.errors.password.message)}</p>}
          </div>
          {form.formState.errors.root && <p className="text-sm text-red-600">{String(form.formState.errors.root.message)}</p>}
          <button type="submit" className="btn-primary w-full">Accedi</button>
        </form>

        <div className="mt-8 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">Credenziali demo</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Manager: manager@meiko.it / password123</li>
            <li>Tecnico: tecnico@meiko.it / password123</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function DashboardPage({ requests }: { requests: Request[] }) {
  const counts = {
    ricevute: requests.filter((r) => r.stato === 'RICEVUTA').length,
    assegnate: requests.filter((r) => r.stato === 'ASSEGNATA').length,
    inIntervento: requests.filter((r) => r.stato === 'IN_INTERVENTO').length,
    completate: requests.filter((r) => r.stato === 'COMPLETATA').length,
    chiuse: requests.filter((r) => r.stato === 'CHIUSA').length,
  };

  const recentRequests = [...requests]
    .sort((a, b) => new Date(b.data_apertura).getTime() - new Date(a.data_apertura).getTime())
    .slice(0, 10);

  const recentInterventions = requests.filter((r) => r.report).slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Pannello di controllo</p>
          <h1 className="page-title">Dashboard</h1>
        </div>
        <Link to="/requests/new" className="btn-primary">Nuova richiesta</Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Ricevute" value={counts.ricevute} accent="blue" />
        <StatCard title="Assegnate" value={counts.assegnate} accent="yellow" />
        <StatCard title="In Intervento" value={counts.inIntervento} accent="yellow" />
        <StatCard title="Completate" value={counts.completate} accent="green" />
        <StatCard title="Chiuse" value={counts.chiuse} accent="slate" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="card p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Ultime 10 richieste</h2>
            <Link to="/requests" className="text-sm font-semibold text-meiko-600">Vedi tutto</Link>
          </div>
          <div className="space-y-3">
            {recentRequests.map((request) => (
              <Link key={request.id} to={`/requests/${request.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:bg-slate-100">
                <div>
                  <p className="font-semibold text-slate-900">{request.numero_richiesta}</p>
                  <p className="text-sm text-slate-500">{new Date(request.data_apertura).toLocaleDateString('it-IT')}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusClasses[request.stato]}`}>{request.stato}</span>
                  <p className="mt-1 text-xs text-slate-500">{request.priorita}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Ultimi interventi completati</h2>
          </div>
          <div className="space-y-3">
            {recentInterventions.map((request) => (
              <div key={request.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="font-semibold text-slate-900">{request.numero_richiesta}</p>
                <p className="text-sm text-slate-500">{request.report?.descrizione_intervento}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientListPage({ clients }: { clients: Client[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Anagrafica</p>
          <h1 className="page-title">Clienti</h1>
        </div>
        <Link to="/clients/new" className="btn-primary">Nuovo cliente</Link>
      </div>

      <div className="card p-4 overflow-hidden">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="pb-3 font-medium">Ragione sociale</th>
              <th className="pb-3 font-medium">Referente</th>
              <th className="pb-3 font-medium">Telefono</th>
              <th className="pb-3 font-medium">Email</th>
              <th className="pb-3 font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-b border-slate-100 align-middle">
                <td className="py-3 font-semibold text-slate-800">{client.ragione_sociale}</td>
                <td className="py-3 text-slate-600">{client.referente}</td>
                <td className="py-3 text-slate-600">{client.telefono}</td>
                <td className="py-3 text-slate-600">{client.email}</td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <Link to={`/clients/${client.id}`} className="btn-secondary">Dettaglio</Link>
                    <Link to={`/clients/${client.id}/edit`} className="btn-secondary">Modifica</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClientFormPage({ clients, setClients }: { clients: Client[]; setClients: React.Dispatch<React.SetStateAction<Client[]>> }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = clients.find((client) => client.id === id);

  const schema = z.object({
    ragione_sociale: z.string().min(2, 'Obbligatorio'),
    referente: z.string().min(2, 'Obbligatorio'),
    telefono: z.string().min(5, 'Obbligatorio'),
    email: z.string().email('Email non valida'),
    indirizzo: z.string().min(5, 'Obbligatorio'),
    note: z.string().optional(),
  });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      ragione_sociale: editing?.ragione_sociale ?? '',
      referente: editing?.referente ?? '',
      telefono: editing?.telefono ?? '',
      email: editing?.email ?? '',
      indirizzo: editing?.indirizzo ?? '',
      note: editing?.note ?? '',
    },
  });

  const onSubmit = (values: any) => {
    if (editing) {
      setClients((prev) => prev.map((client) => client.id === editing.id ? { ...client, ...values } : client));
    } else {
      setClients((prev) => [{ id: crypto.randomUUID(), ...values, created_at: new Date().toISOString() }, ...prev]);
    }
    navigate('/clients');
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.14em] text-slate-500">{editing ? 'Modifica' : 'Nuovo'} cliente</p>
        <h1 className="page-title">{editing ? 'Modifica cliente' : 'Nuovo cliente'}</h1>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="card space-y-5 p-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="label">Ragione sociale</label>
            <input className="input" {...form.register('ragione_sociale')} />
          </div>
          <div>
            <label className="label">Referente</label>
            <input className="input" {...form.register('referente')} />
          </div>
          <div>
            <label className="label">Telefono</label>
            <input className="input" {...form.register('telefono')} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" {...form.register('email')} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Indirizzo</label>
            <input className="input" {...form.register('indirizzo')} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Note</label>
            <textarea rows={4} className="input" {...form.register('note')} />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary">Salva cliente</button>
        </div>
      </form>
    </div>
  );
}

function ClientDetailPage({ clients, machines }: { clients: Client[]; machines: Machine[] }) {
  const { id } = useParams();
  const client = clients.find((entry) => entry.id === id);
  if (!client) return <div className="card p-8">Cliente non trovato.</div>;

  const clientMachines = machines.filter((machine) => machine.cliente_id === client.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Dettaglio cliente</p>
          <h1 className="page-title">{client.ragione_sociale}</h1>
        </div>
        <Link to={`/clients/${client.id}/edit`} className="btn-primary">Modifica</Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.2fr]">
        <div className="card p-5">
          <h2 className="text-lg font-bold text-slate-900">Informazioni cliente</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p><strong>Referente:</strong> {client.referente}</p>
            <p><strong>Telefono:</strong> {client.telefono}</p>
            <p><strong>Email:</strong> {client.email}</p>
            <p><strong>Indirizzo:</strong> {client.indirizzo}</p>
          </div>
          {client.note && <div className="mt-4 rounded-xl bg-slate-50 p-3">{client.note}</div>}
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-bold text-slate-900">Macchine installate</h2>
          <div className="mt-4 space-y-3">
            {clientMachines.length ? clientMachines.map((machine) => (
              <Link key={machine.id} to={`/machines/${machine.id}`} className="block rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{machine.matricola}</p>
                    <p className="text-sm text-slate-500">{machine.modello}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">{machine.attiva ? 'ATTIVA' : 'DISATTIVA'}</span>
                </div>
              </Link>
            )) : <p className="text-sm text-slate-500">Nessuna macchina associata.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function MachineListPage({ machines, clients }: { machines: Machine[]; clients: Client[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Asset</p>
          <h1 className="page-title">Macchine</h1>
        </div>
        <Link to="/machines/new" className="btn-primary">Nuova macchina</Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {machines.map((machine) => {
          const client = clients.find((entry) => entry.id === machine.cliente_id);
          return (
            <Link key={machine.id} to={`/machines/${machine.id}`} className="card p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.12em] text-slate-500">{machine.modello}</p>
                  <h3 className="mt-2 text-xl font-bold text-slate-900">{machine.matricola}</h3>
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${machine.attiva ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                  {machine.attiva ? 'ATTIVA' : 'DISATTIVA'}
                </span>
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>Cliente: {client?.ragione_sociale}</p>
                <p>Serial: {machine.serial_number}</p>
                <p>Ubicazione: {machine.ubicazione}</p>
                <p>Garanzia: {new Date(machine.garanzia_fine).toLocaleDateString('it-IT')}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function MachineFormPage({ machines, setMachines, clients }: { machines: Machine[]; setMachines: React.Dispatch<React.SetStateAction<Machine[]>>; clients: Client[] }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = machines.find((machine) => machine.id === id);

  const schema = z.object({
    cliente_id: z.string().min(1, 'Seleziona cliente'),
    matricola: z.string().min(2, 'Obbligatorio'),
    modello: z.string().min(2, 'Obbligatorio'),
    serial_number: z.string().min(2, 'Obbligatorio'),
    ubicazione: z.string().min(2, 'Obbligatorio'),
    installazione_data: z.string().min(1, 'Obbligatorio'),
    garanzia_fine: z.string().min(1, 'Obbligatorio'),
    note: z.string().optional(),
    attiva: z.boolean(),
  });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      cliente_id: editing?.cliente_id ?? clients[0]?.id ?? '',
      matricola: editing?.matricola ?? '',
      modello: editing?.modello ?? '',
      serial_number: editing?.serial_number ?? '',
      ubicazione: editing?.ubicazione ?? '',
      installazione_data: editing?.installazione_data ?? '',
      garanzia_fine: editing?.garanzia_fine ?? '',
      note: editing?.note ?? '',
      attiva: editing?.attiva ?? true,
    },
  });

  const onSubmit = (values: any) => {
    if (editing) {
      setMachines((prev) => prev.map((machine) => machine.id === editing.id ? { ...machine, ...values } : machine));
    } else {
      setMachines((prev) => [{ id: crypto.randomUUID(), ...values, created_at: new Date().toISOString() }, ...prev]);
    }
    navigate('/machines');
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.14em] text-slate-500">{editing ? 'Modifica' : 'Nuova'} macchina</p>
        <h1 className="page-title">{editing ? 'Modifica macchina' : 'Nuova macchina'}</h1>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="card space-y-5 p-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="label">Cliente</label>
            <select className="input" {...form.register('cliente_id')}>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.ragione_sociale}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Matricola</label>
            <input className="input" {...form.register('matricola')} />
          </div>
          <div>
            <label className="label">Modello</label>
            <input className="input" {...form.register('modello')} />
          </div>
          <div>
            <label className="label">Serial Number</label>
            <input className="input" {...form.register('serial_number')} />
          </div>
          <div>
            <label className="label">Ubicazione</label>
            <input className="input" {...form.register('ubicazione')} />
          </div>
          <div>
            <label className="label">Data installazione</label>
            <input type="date" className="input" {...form.register('installazione_data')} />
          </div>
          <div>
            <label className="label">Fine garanzia</label>
            <input type="date" className="input" {...form.register('garanzia_fine')} />
          </div>
          <div className="flex items-center gap-3 pt-8">
            <input id="attiva" type="checkbox" className="h-4 w-4" {...form.register('attiva')} />
            <label htmlFor="attiva" className="text-sm text-slate-700">Attiva</label>
          </div>
          <div className="md:col-span-2">
            <label className="label">Note</label>
            <textarea rows={4} className="input" {...form.register('note')} />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary">Salva macchina</button>
        </div>
      </form>
    </div>
  );
}

function MachineDetailPage({ machines, clients, requests }: { machines: Machine[]; clients: Client[]; requests: Request[] }) {
  const { id } = useParams();
  const machine = machines.find((entry) => entry.id === id);
  if (!machine) return <div className="card p-8">Macchina non trovata.</div>;

  const client = clients.find((entry) => entry.id === machine.cliente_id);
  const history = requests.filter((request) => request.macchina_id === machine.id).sort((a, b) => new Date(b.data_apertura).getTime() - new Date(a.data_apertura).getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Dettaglio macchina</p>
          <h1 className="page-title">{machine.matricola}</h1>
        </div>
        <div className="flex gap-2">
          <Link to={`/machines/${machine.id}/edit`} className="btn-secondary">Modifica</Link>
          <Link to={`/requests/new?machineId=${machine.id}`} className="btn-primary">Nuova richiesta</Link>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <div className="card p-5">
          <h2 className="text-lg font-bold text-slate-900">Dati macchina</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p><strong>Modello:</strong> {machine.modello}</p>
            <p><strong>Serial Number:</strong> {machine.serial_number}</p>
            <p><strong>Ubicazione:</strong> {machine.ubicazione}</p>
            <p><strong>Cliente:</strong> {client?.ragione_sociale}</p>
            <p><strong>Installazione:</strong> {new Date(machine.installazione_data).toLocaleDateString('it-IT')}</p>
            <p><strong>Garanzia fine:</strong> {new Date(machine.garanzia_fine).toLocaleDateString('it-IT')}</p>
          </div>
          {machine.note && <div className="mt-4 rounded-xl bg-slate-50 p-3">{machine.note}</div>}
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-bold text-slate-900">Storico interventi</h2>
          <div className="mt-4 space-y-3">
            {history.length ? history.map((request) => (
              <Link key={request.id} to={`/requests/${request.id}`} className="block rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{request.numero_richiesta}</p>
                    <p className="text-sm text-slate-500">{new Date(request.data_apertura).toLocaleDateString('it-IT')}</p>
                  </div>
                  <span className="rounded-full bg-meiko-50 px-2 py-1 text-xs font-semibold text-meiko-700">{request.stato}</span>
                </div>
              </Link>
            )) : <p className="text-sm text-slate-500">Nessun intervento registrato.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestListPage({ requests, clients, machines }: { requests: Request[]; clients: Client[]; machines: Machine[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Service</p>
          <h1 className="page-title">Richieste</h1>
        </div>
        <Link to="/requests/new" className="btn-primary">Nuova richiesta</Link>
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr className="text-slate-500">
              <th className="px-4 py-3 font-medium">Numero</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Macchina</th>
              <th className="px-4 py-3 font-medium">Stato</th>
              <th className="px-4 py-3 font-medium">Priorità</th>
              <th className="px-4 py-3 font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => {
              const client = clients.find((entry) => entry.id === request.cliente_id);
              const machine = machines.find((entry) => entry.id === request.macchina_id);
              return (
                <tr key={request.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-semibold text-slate-900">{request.numero_richiesta}</td>
                  <td className="px-4 py-3 text-slate-600">{client?.ragione_sociale}</td>
                  <td className="px-4 py-3 text-slate-600">{machine?.matricola}</td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClasses[request.stato]}`}>{request.stato}</span></td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${priorityClasses[request.priorita]}`}>{request.priorita}</span></td>
                  <td className="px-4 py-3"><Link to={`/requests/${request.id}`} className="btn-secondary">Apri</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RequestFormPage({ clients, machines, setRequests }: { clients: Client[]; machines: Machine[]; setRequests: React.Dispatch<React.SetStateAction<Request[]>> }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const machineId = searchParams.get('machineId') ?? '';

  const schema = z.object({
    cliente_id: z.string().min(1, 'Obbligatorio'),
    macchina_id: z.string().min(1, 'Obbligatorio'),
    tipo_richiesta: z.enum(['MANUTENZIONE', 'GUASTO', 'INSTALLAZIONE', 'PREVENTIVO']),
    priorita: z.enum(['BASSA', 'MEDIA', 'ALTA', 'URGENTE']),
    problema_segnalato: z.string().min(10, 'Descrizione troppo breve'),
  });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      cliente_id: clients[0]?.id ?? '',
      macchina_id: machineId || machines[0]?.id || '',
      tipo_richiesta: 'GUASTO',
      priorita: 'MEDIA',
      problema_segnalato: '',
    },
  });

  useEffect(() => {
    if (machineId) {
      const selected = machines.find((m) => m.id === machineId);
      if (selected) {
        form.setValue('cliente_id', selected.cliente_id);
        form.setValue('macchina_id', selected.id);
      }
    }
  }, [machineId, machines, form]);

  const onSubmit = (values: any) => {
    const nextRequest: Request = {
      id: crypto.randomUUID(),
      numero_richiesta: generateRequestNumber(),
      cliente_id: values.cliente_id,
      macchina_id: values.macchina_id,
      stato: 'RICEVUTA',
      priorita: values.priorita,
      tipo_richiesta: values.tipo_richiesta,
      problema_segnalato: values.problema_segnalato,
      data_apertura: new Date().toISOString(),
      timeline: [{
        id: crypto.randomUUID(),
        richiesta_id: 'new',
        tipo_evento: 'CREATA',
        descrizione: 'Richiesta creata.',
        created_at: new Date().toISOString(),
      }],
    };

    setRequests((prev) => [nextRequest, ...prev]);
    navigate('/requests');
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Nuova richiesta</p>
        <h1 className="page-title">Creazione richiesta</h1>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="card space-y-5 p-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="label">Cliente</label>
            <select className="input" {...form.register('cliente_id')}>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.ragione_sociale}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Macchina</label>
            <select className="input" {...form.register('macchina_id')}>
              {machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.matricola} - {machine.modello}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tipo richiesta</label>
            <select className="input" {...form.register('tipo_richiesta')}>
              <option value="MANUTENZIONE">MANUTENZIONE</option>
              <option value="GUASTO">GUASTO</option>
              <option value="INSTALLAZIONE">INSTALLAZIONE</option>
              <option value="PREVENTIVO">PREVENTIVO</option>
            </select>
          </div>
          <div>
            <label className="label">Priorità</label>
            <select className="input" {...form.register('priorita')}>
              <option value="BASSA">BASSA</option>
              <option value="MEDIA">MEDIA</option>
              <option value="ALTA">ALTA</option>
              <option value="URGENTE">URGENTE</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Descrizione problema</label>
            <textarea rows={5} className="input" {...form.register('problema_segnalato')} />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary">Salva richiesta</button>
        </div>
      </form>
    </div>
  );
}

function RequestDetailPage({ requests, machines, clients, setRequests }: { requests: Request[]; machines: Machine[]; clients: Client[]; setRequests: React.Dispatch<React.SetStateAction<Request[]>> }) {
  const { id } = useParams();
  const request = requests.find((entry) => entry.id === id);
  const [selectedTech, setSelectedTech] = useState(request?.assegnatario_id ?? 'tech-1');
  const [reportForm, setReportForm] = useState({
    descrizione_intervento: request?.report?.descrizione_intervento ?? '',
    esito: request?.report?.esito ?? 'RISOLTO',
    ore_funzionamento: request?.report?.ore_funzionamento ?? 1,
    numero_cicli: request?.report?.numero_cicli ?? 0,
    firma_tecnico: request?.report?.firma_tecnico ?? '',
    firma_cliente: request?.report?.firma_cliente ?? '',
  });
  const [spareParts, setSpareParts] = useState<SparePart[]>(request?.report?.ricambi ?? [{ id: crypto.randomUUID(), codice_ricambio: '', descrizione: '', quantita: 1 }]);

  if (!request) return <div className="card p-8">Richiesta non trovata.</div>;

  const client = clients.find((entry) => entry.id === request.cliente_id);
  const machine = machines.find((entry) => entry.id === request.macchina_id);
  const technicianName = useMemo(() => {
    const tech = techUsers.find((entry) => entry.id === request.assegnatario_id);
    return tech?.name ?? 'Non assegnato';
  }, [request.assegnatario_id]);

  const assignTecnico = () => {
    setRequests((current) => current.map((entry) => entry.id === request.id ? {
      ...entry,
      stato: 'ASSEGNATA',
      assegnatario_id: selectedTech,
      data_assegnazione: new Date().toISOString(),
      timeline: [...entry.timeline, { id: crypto.randomUUID(), richiesta_id: entry.id, tipo_evento: 'ASSEGNATA', descrizione: `Assegnata a ${selectedTech}`, created_at: new Date().toISOString() }],
    } : entry));
  };

  const startIntervention = () => {
    setRequests((current) => current.map((entry) => entry.id === request.id ? {
      ...entry,
      stato: 'IN_INTERVENTO',
      data_inizio_intervento: new Date().toISOString(),
      timeline: [...entry.timeline, { id: crypto.randomUUID(), richiesta_id: entry.id, tipo_evento: 'IN_INTERVENTO', descrizione: 'Intervento iniziato.', created_at: new Date().toISOString() }],
    } : entry));
  };

  const completeReport = () => {
    const report: WorkReport = {
      id: crypto.randomUUID(),
      richiesta_id: request.id,
      tecnico_id: selectedTech,
      descrizione_intervento: reportForm.descrizione_intervento,
      esito: reportForm.esito as InterventionResult,
      ore_funzionamento: reportForm.ore_funzionamento,
      numero_cicli: reportForm.numero_cicli,
      firma_tecnico: reportForm.firma_tecnico,
      firma_cliente: reportForm.firma_cliente,
      ricambi: spareParts.filter((part) => part.codice_ricambio && part.descrizione),
      created_at: new Date().toISOString(),
    };

    setRequests((current) => current.map((entry) => entry.id === request.id ? {
      ...entry,
      stato: 'COMPLETATA',
      report,
      timeline: [...entry.timeline, { id: crypto.randomUUID(), richiesta_id: entry.id, tipo_evento: 'COMPLETATA', descrizione: 'Rapportino completato.', created_at: new Date().toISOString() }],
    } : entry));
  };

  const closeRequest = () => {
    setRequests((current) => current.map((entry) => entry.id === request.id ? {
      ...entry,
      stato: 'CHIUSA',
      data_chiusura: new Date().toISOString(),
      timeline: [...entry.timeline, { id: crypto.randomUUID(), richiesta_id: entry.id, tipo_evento: 'CHIUSA', descrizione: 'Richiesta chiusa definitivamente.', created_at: new Date().toISOString() }],
    } : entry));
  };

  const generatePdf = () => {
    if (client && machine) {
      downloadPdf(request, client.ragione_sociale, `${machine.matricola} - ${machine.modello}`, technicianName);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Richiesta</p>
          <h1 className="page-title">{request.numero_richiesta}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={assignTecnico} className="btn-secondary">Assegna tecnico</button>
          <button onClick={startIntervention} className="btn-secondary">Inizia intervento</button>
          <button onClick={completeReport} className="btn-primary">Completa rapportino</button>
          <button onClick={closeRequest} className="btn-danger">Chiudi richiesta</button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Dettaglio richiesta</h2>
            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClasses[request.stato]}`}>{request.stato}</span>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Cliente</p>
              <p className="mt-1 font-semibold text-slate-800">{client?.ragione_sociale}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Macchina</p>
              <p className="mt-1 font-semibold text-slate-800">{machine?.matricola} - {machine?.modello}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Priorità</p>
              <p className="mt-1 font-semibold text-slate-800">{request.priorita}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Tipo</p>
              <p className="mt-1 font-semibold text-slate-800">{request.tipo_richiesta}</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Problema segnalato</p>
            <p className="mt-2 text-sm text-slate-700">{request.problema_segnalato}</p>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-bold text-slate-900">Assegnazione tecnico</h2>
          <div className="mt-4 space-y-4">
            <select className="input" value={selectedTech} onChange={(e) => setSelectedTech(e.target.value)}>
              {techUsers.map((tech) => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
            </select>
            <button onClick={assignTecnico} className="btn-primary w-full">Assegna</button>
            <button onClick={generatePdf} className="btn-secondary w-full">Genera PDF</button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="card p-5">
          <h2 className="text-lg font-bold text-slate-900">Rapportino tecnico</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="label">Descrizione intervento</label>
              <textarea rows={4} className="input" value={reportForm.descrizione_intervento} onChange={(e) => setReportForm((prev) => ({ ...prev, descrizione_intervento: e.target.value }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="label">Esito</label>
                <select className="input" value={reportForm.esito} onChange={(e) => setReportForm((prev) => ({ ...prev, esito: e.target.value }))}>
                  <option value="RISOLTO">RISOLTO</option>
                  <option value="NON_RISOLTO">NON_RISOLTO</option>
                </select>
              </div>
              <div>
                <label className="label">Ore</label>
                <input type="number" className="input" value={reportForm.ore_funzionamento} onChange={(e) => setReportForm((prev) => ({ ...prev, ore_funzionamento: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="label">Cicli</label>
                <input type="number" className="input" value={reportForm.numero_cicli} onChange={(e) => setReportForm((prev) => ({ ...prev, numero_cicli: Number(e.target.value) }))} />
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Ricambi</h3>
              <div className="space-y-3">
                {spareParts.map((part, index) => (
                  <div key={part.id} className="grid gap-2 md:grid-cols-[1fr_1.4fr_0.5fr]">
                    <input value={part.codice_ricambio} onChange={(e) => setSpareParts((prev) => prev.map((entry, idx) => idx === index ? { ...entry, codice_ricambio: e.target.value } : entry))} className="input" placeholder="Codice" />
                    <input value={part.descrizione} onChange={(e) => setSpareParts((prev) => prev.map((entry, idx) => idx === index ? { ...entry, descrizione: e.target.value } : entry))} className="input" placeholder="Descrizione" />
                    <input type="number" value={part.quantita} onChange={(e) => setSpareParts((prev) => prev.map((entry, idx) => idx === index ? { ...entry, quantita: Number(e.target.value) } : entry))} className="input" placeholder="Qt" />
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setSpareParts((prev) => [...prev, { id: crypto.randomUUID(), codice_ricambio: '', descrizione: '', quantita: 1 }])} className="btn-secondary mt-3">Aggiungi ricambio</button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="label">Firma tecnico</p>
                <SignaturePad value={reportForm.firma_tecnico} onChange={(value) => setReportForm((prev) => ({ ...prev, firma_tecnico: value }))} />
              </div>
              <div>
                <p className="label">Firma cliente</p>
                <SignaturePad value={reportForm.firma_cliente} onChange={(value) => setReportForm((prev) => ({ ...prev, firma_cliente: value }))} />
              </div>
            </div>

            <button onClick={completeReport} className="btn-primary w-full">Salva rapportino</button>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-bold text-slate-900">Timeline</h2>
          <div className="mt-4 space-y-4">
            {request.timeline.map((event) => (
              <div key={event.id} className="border-l-2 border-meiko-200 pl-4">
                <p className="text-sm font-semibold text-slate-800">{event.tipo_evento}</p>
                <p className="text-sm text-slate-600">{event.descrizione}</p>
                <p className="mt-1 text-xs text-slate-400">{new Date(event.created_at).toLocaleString('it-IT')}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [clients, setClients] = useState<Client[]>(demoClients);
  const [machines, setMachines] = useState<Machine[]>(demoMachines);
  const [requests, setRequests] = useState<Request[]>(demoRequests);
  const [user, setUser] = useState<User | null>(demoUsers[0]);

  const login = async (email: string, password: string) => {
    const found = demoUsers.find((entry) => entry.email === email && password === 'password123');
    if (found) {
      setUser(found);
      return true;
    }
    return false;
  };

  const logout = () => setUser(null);

  const authValue = useMemo(() => ({ user, login, logout }), [user]);

  return (
    <AuthContext.Provider value={authValue}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage requests={requests} />} />
            <Route path="/clients" element={<ClientListPage clients={clients} />} />
            <Route path="/clients/new" element={<ClientFormPage clients={clients} setClients={setClients} />} />
            <Route path="/clients/:id" element={<ClientDetailPage clients={clients} machines={machines} />} />
            <Route path="/clients/:id/edit" element={<ClientFormPage clients={clients} setClients={setClients} />} />
            <Route path="/machines" element={<MachineListPage machines={machines} clients={clients} />} />
            <Route path="/machines/new" element={<MachineFormPage machines={machines} setMachines={setMachines} clients={clients} />} />
            <Route path="/machines/:id" element={<MachineDetailPage machines={machines} clients={clients} requests={requests} />} />
            <Route path="/machines/:id/edit" element={<MachineFormPage machines={machines} setMachines={setMachines} clients={clients} />} />
            <Route path="/requests" element={<RequestListPage requests={requests} clients={clients} machines={machines} />} />
            <Route path="/requests/new" element={<RequestFormPage clients={clients} machines={machines} setRequests={setRequests} />} />
            <Route path="/requests/:id" element={<RequestDetailPage requests={requests} machines={machines} clients={clients} setRequests={setRequests} />} />
          </Route>
          <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
