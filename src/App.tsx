import React, { useState, useEffect } from 'react';
import defaultData from './data_convenio_default.json';
import { calculatePayroll, calculateSeverance } from './utils/payrollEngine';
import type { Category, PayrollInput, PayrollResult } from './utils/payrollEngine';
import {
  Settings, Calculator, TrendingUp, FileText, LayoutDashboard, Briefcase, CheckCircle2, Timer, Activity, Percent, UserPlus, Save, Trash2, Download, ClipboardList, ChevronDown, User, Moon, Sun, Palette, Leaf, Sparkles, TreePine, CloudSun, Building2, Mountain
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SavedProfile {
  id: string;
  name: string;
  input: PayrollInput;
  timestamp: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'payroll' | 'config' | 'costs' | 'consultas' | 'comparison' | 'finiquito' | 'tenders'>('payroll');
  const [theme, setTheme] = useState<'premium' | 'dark' | 'midnight' | 'emerald' | 'forest' | 'soft-gold' | 'corporate' | 'earth'>('premium');
  const [showThemes, setShowThemes] = useState(false);
  const [activeYear, setActiveYear] = useState<string>('2025');
  const [categories, setCategories] = useState<Category[]>(defaultData.years['2025'].categorias);
  const [config, setConfig] = useState(defaultData.years['2025'].config);
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [selectedComparisonIds, setSelectedComparisonIds] = useState<string[]>([]);

  const [payrollInput, setPayrollInput] = useState<PayrollInput>({
    categoryId: 'limpiador',
    jornadaSemanal: 40,
    fechaAlta: new Date().toISOString().split('T')[0],
    irpfManual: 2,
    pagasProrrateadas: false,
    horasNocturnidad: 0,
    minutosNocturnidad: 0,
    diasVacaciones: 0,
    extraDevengos: []
  });

  // Finiquito State
  const [finiquitoInput, setFiniquitoInput] = useState({
    fechaAlta: payrollInput.fechaAlta,
    fechaBaja: new Date().toISOString().split('T')[0],
    vacacionesPendientes: 0,
    incluirIndemnizacion: false,
    diasIndemnizacion: 12
  });

  const [saveStatus, setSaveStatus] = useState<'none' | 'saving' | 'success'>('none');

  const [licencias] = useState([
    { concepto: "Matrimonio / Pareja de Hecho", dias: "20 días naturales", nota: "Inscrita en Registro Oficial. Opción a +10 días no retribuidos." },
    { concepto: "Fallecimiento Cónyuge o conviviente, hijos o padres", dias: "7 días naturales", nota: "Ampliables a 9 si es fuera de la Isla." },
    { concepto: "Alumbramiento de esposa o conviviente", dias: "10 días naturales", nota: "Ampliables a 12 si es fuera de la Isla." },
    { concepto: "Enfermedad grave o ingreso (Cónyuge, hijos o padres)", dias: "5 días naturales", nota: "Ampliables a 7 si es fuera de la Isla." },
    { concepto: "Hermanos, suegros, abuelos, nietos o cuñados (Fallecimiento)", dias: "4 días naturales", nota: "" },
    { concepto: "Traslado fuera de isla para revisión médica", dias: "5 días naturales", nota: "Para uno mismo, hijos, padres o cónyuge (con informe SCS)." },
    { concepto: "Asuntos Propios (Días moscosos)", dias: "2 días hábiles", nota: "Sin necesidad de justificación. Solicitar con antelación." },
    { concepto: "Accidente/Enfermedad grave/Hosp. (Hermanos, abuelos, cuñados, nietos)", dias: "2 días", nota: "Ampliables a 4 si hay desplazamiento." },
    { concepto: "Cambio de domicilio habitual", dias: "2 días naturales", nota: "" },
    { concepto: "Matrimonio de hijos o hermanos", dias: "1 día natural", nota: "Ampliable a 2 si es fuera de la isla." },
    { concepto: "Exámenes finales y títulos oficiales", dias: "2 días naturales", nota: "" },
    { concepto: "Fallecimiento de tíos o hijos políticos", dias: "1 día natural", nota: "" },
    { concepto: "Fallecimiento de sobrinos", dias: "1 día natural", nota: "" },
    { concepto: "Acompañamiento médico (Hijos o familiares 2º grado)", dias: "3 horas", nota: "Medicina general o especialista (justificado)." },
    { concepto: "Lactancia (Hijo < 12 meses)", dias: "1 hora/día", nota: "Opcional: Acumular en 24 días naturales tras maternidad." },
    { concepto: "Deber público y personal", dias: "Tiempo indispensable", nota: "Citaciones, DNI, trámites oficiales improrrogables." },
    { concepto: "Visita familiar 1er grado hospitalizado", dias: "2 horas/día", nota: "Hasta 3 meses si coincide horario de visita con laboral." },
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  // Vacation Calculator State
  const [vacStart, setVacStart] = useState('');
  const [vacEnd, setVacEnd] = useState('');
  const [vacDaysPerYear, setVacDaysPerYear] = useState(34);
  const [vacResult, setVacResult] = useState<number | null>(null);
  const [consultasSubTab, setConsultasSubTab] = useState<'licencias' | 'calculadora' | 'resumen'>('licencias');

  const [resumenConvenio] = useState([
    { capitulo: "I", titulo: "Disposiciones Generales", resumen: "Vigencia del 2017 al 2020 (Prorrogado). Ámbito provincial para el sector de Limpieza de Edificios y Locales en S/C de Tenerife." },
    { capitulo: "II", titulo: "Clasificación del Personal", resumen: "4 Grupos: Directivos, Administrativos, Mandos Intermedios y Operarios. Define funciones y niveles de movilidad funcional." },
    { capitulo: "III", titulo: "Empleo y Contratación", resumen: "Prueba de 15 días para operarios. Regula la subrogación obligatoria para garantizar la estabilidad de los puestos de trabajo." },
    { capitulo: "IV", titulo: "Tiempo de Trabajo", resumen: "Jornada máxima de 40h semanales. 34 días naturales de vacaciones. Máximo de 60 horas extraordinarias anuales." },
    { capitulo: "V", titulo: "Licencias y Excedencias", resumen: "Regula los permisos retribuidos (Art. 33) y las excedencias voluntarias o forzosas (de 4 meses a 5 años)." },
    { capitulo: "VI", titulo: "Retribuciones", resumen: "Compuesta por Salario Base, Complementos (Plus Convenio, Plus Distancia) y Bolsa de Vacaciones íntegra." },
    { capitulo: "VII", titulo: "Seguridad y Salud", resumen: "Obligación de prevención de riesgos laborales, formación en seguridad y vigilancia periódica de la salud de los trabajadores." },
    { capitulo: "VIII", titulo: "Régimen Disciplinario", resumen: "Tipifica faltas leves, graves y muy graves. Establece el procedimiento sancionador y los plazos de prescripción." },
    { capitulo: "IX", titulo: "Mejoras Sociales", resumen: "Seguro de accidentes e incapacidad, formación profesional continua y ayudas económicas por jubilación o fallecimiento." },
  ]);

  const [calendarDays, setCalendarDays] = useState<Record<number, 'none' | 'night' | 'vacation'>>({});

  const [newExtra, setNewExtra] = useState({ name: '', amount: '' });

  const [result, setResult] = useState<PayrollResult | null>(null);
  const [showProfiles, setShowProfiles] = useState(false);

  // Tenders State
  const [tendersData, setTendersData] = useState({
    label: 'Nueva Licitación 2025',
    workers: [] as { id: string, categoryId: string, count: number, jornada: number }[],
    materials: 0,
    machinery: 0,
    otherCosts: 0,
    overheadPercent: 13,
    profitPercent: 6,
    taxType: 'IGIC' as 'IVA' | 'IGIC'
  });

  // Handle Theme Change
  useEffect(() => {
    localStorage.setItem('payroll_theme', theme);
  }, [theme]);
  // Load from LocalStorage
  useEffect(() => {
    const savedCats = localStorage.getItem(`payroll_categories_${activeYear}`);
    const savedConfig = localStorage.getItem(`payroll_config_${activeYear}`);
    const storedProfiles = localStorage.getItem('payroll_profiles');

    // Auth check (independent of year)
    const auth = localStorage.getItem('payroll_auth');
    if (auth === 'admin') {
      setIsAuthenticated(true);
      setIsAdmin(true);
    } else if (auth === 'user') {
      setIsAuthenticated(true);
      setIsAdmin(false);
    }

    // Category loading
    if (savedCats) {
      setCategories(JSON.parse(savedCats));
    } else {
      const yearData = defaultData.years[activeYear as keyof typeof defaultData.years];
      setCategories(yearData?.categorias || defaultData.years['2025'].categorias);
    }

    // Config loading
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    } else {
      const yearData = defaultData.years[activeYear as keyof typeof defaultData.years];
      setConfig(yearData?.config || defaultData.years['2025'].config);
    }

    if (storedProfiles) setSavedProfiles(JSON.parse(storedProfiles));

    const savedTheme = localStorage.getItem('payroll_theme') as 'premium' | 'dark';
    if (savedTheme) setTheme(savedTheme);

    setIsLoaded(true);
  }, [activeYear]);

  // Save to LocalStorage (Keep automatic for backup but focus on manual)
  useEffect(() => {
    if (!isLoaded) return;
    if (categories.length > 0) {
      localStorage.setItem('payroll_categories', JSON.stringify(categories));
    }
    localStorage.setItem('payroll_config', JSON.stringify(config));
  }, [categories, config, isLoaded]);

  const handleSaveConfig = () => {
    setSaveStatus('saving');
    localStorage.setItem(`payroll_categories_${activeYear}`, JSON.stringify(categories));
    localStorage.setItem(`payroll_config_${activeYear}`, JSON.stringify(config));
    setTimeout(() => {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('none'), 3000);
    }, 500);
  };

  const handleResetConfig = () => {
    if (window.confirm('¿Está seguro de que desea restaurar los valores por defecto del convenio? Se perderán todos los cambios manuales.')) {
      const yearData = defaultData.years[activeYear as keyof typeof defaultData.years] || defaultData.years['2025'];
      setCategories(yearData.categorias);
      setConfig(yearData.config);
      setSaveStatus('saving');
      setTimeout(() => {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('none'), 3000);
      }, 500);
    }
  };

  // Vacation calculator logic
  useEffect(() => {
    if (vacStart && vacEnd) {
      const start = new Date(vacStart);
      const end = new Date(vacEnd);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const calc = (diffDays / 365) * vacDaysPerYear;
      setVacResult(calc);
    } else {
      setVacResult(null);
    }
  }, [vacStart, vacEnd, vacDaysPerYear]);

  // Sync calendar marks with payroll numbers
  useEffect(() => {
    const nightCount = Object.values(calendarDays).filter(v => v === 'night').length;
    const vacCount = Object.values(calendarDays).filter(v => v === 'vacation').length;

    setPayrollInput(prev => ({
      ...prev,
      horasNocturnidad: nightCount * (prev.jornadaSemanal / 40 * 8), // Rough estimate: 8h shift
      diasVacaciones: vacCount
    }));
  }, [calendarDays]);

  // Recalculate on input change
  useEffect(() => {
    const cat = categories.find(c => c.id === payrollInput.categoryId) || categories[0];
    if (cat) {
      const res = calculatePayroll(payrollInput, cat, config);
      setResult(res);
    }
  }, [payrollInput, categories, config]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    // @ts-ignore
    const checked = e.target.checked;

    setPayrollInput(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value)
    }));
  };

  const filteredLicencias = licencias.filter(l =>
    l.concepto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const saveProfile = (name: string) => {
    const newProfile: SavedProfile = {
      id: `profile-${Date.now()}`,
      name: name || `Empleado ${savedProfiles.length + 1}`,
      input: { ...payrollInput },
      timestamp: new Date().toLocaleString()
    };
    const updated = [...savedProfiles, newProfile];
    setSavedProfiles(updated);
    localStorage.setItem('payroll_profiles', JSON.stringify(updated));
  };

  const deleteProfile = (id: string) => {
    const updated = savedProfiles.filter(p => p.id !== id);
    setSavedProfiles(updated);
    localStorage.setItem('payroll_profiles', JSON.stringify(updated));
  };

  const loadProfile = (profile: SavedProfile) => {
    setPayrollInput(profile.input);
    setActiveTab('payroll');
  };

  const toggleDay = (day: number) => {
    setCalendarDays(prev => {
      const current = prev[day] || 'none';
      const next: any = current === 'none' ? 'night' : (current === 'night' ? 'vacation' : 'none');
      return { ...prev, [day]: next };
    });
  };

  const addWorker = () => {
    setTendersData(prev => ({
      ...prev,
      workers: [...prev.workers, { id: Math.random().toString(36).substr(2, 9), categoryId: categories[0]?.id || 'limpiador', count: 1, jornada: 40 }]
    }));
  };

  const removeWorker = (id: string) => {
    setTendersData(prev => ({
      ...prev,
      workers: prev.workers.filter(w => w.id !== id)
    }));
  };

  const updateWorker = (id: string, updates: Partial<{ categoryId: string, count: number, jornada: number }>) => {
    setTendersData(prev => ({
      ...prev,
      workers: prev.workers.map(w => w.id === id ? { ...w, ...updates } : w)
    }));
  };

  const generatePDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    const catName = categories.find(c => c.id === payrollInput.categoryId)?.nombre || 'Categoría';

    // Header
    doc.setFontSize(22);
    doc.setTextColor(14, 165, 233);
    doc.text('CÁLCULOS LABORALES', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 105, 28, { align: 'center' });

    // Employee Info
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('RESUMEN DEL EMPLEADO', 20, 45);

    autoTable(doc, {
      startY: 50,
      head: [['Concepto', 'Detalle']],
      body: [
        ['Categoría', catName],
        ['Jornada', `${payrollInput.jornadaSemanal}h / semana(${(payrollInput.jornadaSemanal / 40 * 100).toFixed(0)}%)`],
        ['Fecha Alta', new Date(payrollInput.fechaAlta).toLocaleDateString()],
        ['IRPF Aplicado', `${payrollInput.irpfManual}%`]
      ]
    });

    // Payroll Table
    doc.text('DETALLE DE NÓMINA MENSUAL', 20, (doc as any).lastAutoTable.finalY + 15);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Concepto', 'Importe']],
      body: [
        ...result.devengos.map(d => [d.concept, `${d.amount.toFixed(2)}€`]),
        ['TOTAL BRUTO', `${result.bruto.toFixed(2)}€`],
        ...result.deducciones.map(d => [d.concept, `- ${d.amount.toFixed(2)}€`]),
        ['LÍQUIDO A PERCIBIR', `${result.neto.toFixed(2)}€`]
      ],
      theme: 'striped',
      headStyles: { fillColor: [14, 165, 233] },
      didParseCell: (data) => {
        if (data.row.index === result.devengos.length + result.deducciones.length + 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [14, 165, 233];
        }
      }
    });

    // Company Cost
    doc.text('ANÁLISIS DE COSTE EMPRESA', 20, (doc as any).lastAutoTable.finalY + 15);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Métrica', 'Mensual', 'Anual (Proyectado)']],
      body: [
        ['Salario Bruto', `${result.bruto.toFixed(2)}€`, `${(result.bruto * 12).toFixed(2)}€`],
        ['Cargas Sociales', `${result.costeEmpresa.seguridadSocial.toFixed(2)}€`, '---'],
        ['COSTE TOTAL', `${result.costeEmpresa.total.toFixed(2)}€`, `${result.costeEmpresa.anual.toFixed(2)}€`]
      ],
      headStyles: { fillColor: [245, 158, 11] }
    });

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Este documento es un simulador informativo basado en el Convenio de Limpieza de Tenerife.', 105, 285, { align: 'center' });

    doc.save(`Nomina_${catName.replace(/\s+/g, '_')}.pdf`);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'Apeles1966*salva*app') {
      setIsAuthenticated(true);
      setIsAdmin(true);
      setLoginError(false);
      localStorage.setItem('payroll_auth', 'admin');
    } else if (passwordInput === 'User123') {
      setIsAuthenticated(true);
      setIsAdmin(false);
      setLoginError(false);
      localStorage.setItem('payroll_auth', 'user');
    } else {
      setLoginError(true);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="login-screen">
        <div className="glass-card login-box">
          <div className="brand" style={{ marginBottom: '2.5rem' }}>
            <h1>CÁLCULOS <span>by SALVA</span></h1>
          </div>
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>Contraseña de Acceso</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Introduzca la clave..."
                autoFocus
              />
            </div>
            {loginError && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '1rem', textAlign: 'center' }}>Contraseña incorrecta. Inténtelo de nuevo.</p>}
            <button type="submit" className="btn-primary" style={{ width: '100%' }}>
              Entrar al Sistema
            </button>
          </form>
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <img src="apeles-logo.jpg" alt="Logo" style={{ maxHeight: '40px', opacity: 0.6 }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-wrapper theme-${theme}`}>
      <aside className="sidebar">
        <div className="brand">
          <h1>CÁLCULOS <span>by SALVA</span></h1>
        </div>

        <nav className="sidebar-nav">
          <button className={`btn-nav ${activeTab === 'payroll' ? 'active' : ''}`} onClick={() => setActiveTab('payroll')}>
            <Calculator size={20} /> <span>Simulador Nómina</span>
          </button>
          <button className={`btn-nav ${activeTab === 'costs' ? 'active' : ''}`} onClick={() => setActiveTab('costs')}>
            <TrendingUp size={20} /> <span>Costes Empresa</span>
          </button>
          <button className={`btn-nav ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </button>
          <button className={`btn-nav ${activeTab === 'comparison' ? 'active' : ''}`} onClick={() => setActiveTab('comparison')}>
            <Briefcase size={20} /> <span>Comparativa</span>
          </button>
          <button className={`btn-nav ${activeTab === 'finiquito' ? 'active' : ''}`} onClick={() => setActiveTab('finiquito')}>
            <Timer size={18} /> <span>Simulador Finiquito</span>
          </button>
          <button className={`btn-nav ${activeTab === 'consultas' ? 'active' : ''}`} onClick={() => setActiveTab('consultas')}>
            <FileText size={20} /> <span>Convenio</span>
          </button>
          <button className={`btn-nav ${activeTab === 'tenders' ? 'active' : ''}`} onClick={() => setActiveTab('tenders')}>
            <ClipboardList size={20} /> <span>Licitaciones</span>
          </button>
          {isAdmin && (
            <button className={`btn-nav ${activeTab === 'config' ? 'active' : ''}`} onClick={() => setActiveTab('config')}>
              <Settings size={20} /> <span>Configuración</span>
            </button>
          )}
        </nav>


        <div className="user-profile">
          <img src="user-photo.png" alt="Salvador" className="user-avatar-img" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Salvador S.M.</span>
            <span style={{ fontSize: '0.7rem' }}>{isAdmin ? 'Administrador' : 'Usuario'}</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>
              {activeTab === 'dashboard' && 'Resumen Analítico'}
              {activeTab === 'payroll' && 'Simulador de Nómina Mensual'}
              {activeTab === 'costs' && 'Análisis de Costes y Provisiones'}
              {activeTab === 'consultas' && 'Consultas de Convenio Colectivo'}
              {activeTab === 'comparison' && 'Comparativa de Salarios por Categoría'}
              {activeTab === 'finiquito' && 'Simulador de Finiquito y Liquidación'}
              {activeTab === 'tenders' && 'Presupuestador de Licitaciones'}
              {activeTab === 'config' && 'Configuración del Sistema'}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cálculos actualizados v1.9 Stable</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <button className="header-action-btn" onClick={() => setShowThemes(!showThemes)}>
                <Palette size={18} /> <span>Temas</span> <ChevronDown size={14} />
              </button>
              {showThemes && (
                <div className="glass-card" style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.5rem',
                  zIndex: 1000,
                  width: '240px',
                  padding: '0.5rem',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}>
                  <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>PERSONALIZACIÓN VISUAL</span>
                  </div>
                  <div className="btn-nav" style={{ justifyContent: 'flex-start', marginBottom: '0.25rem', background: theme === 'premium' ? 'var(--primary-glow)' : '' }}
                    onClick={() => { setTheme('premium'); setShowThemes(false); }}>
                    <Sun size={16} color="#6366f1" />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Premium Light</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Indigo y Glassmorphism</span>
                    </div>
                  </div>
                  <div className="btn-nav" style={{ justifyContent: 'flex-start', marginBottom: '0.25rem', background: theme === 'dark' ? 'var(--primary-glow)' : '' }}
                    onClick={() => { setTheme('dark'); setShowThemes(false); }}>
                    <Moon size={16} color="#0ea5e9" />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Clásico Dark</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Fondo negro y Cyan</span>
                    </div>
                  </div>
                  <div className="btn-nav" style={{ justifyContent: 'flex-start', marginBottom: '0.25rem', background: theme === 'midnight' ? 'var(--primary-glow)' : '' }}
                    onClick={() => { setTheme('midnight'); setShowThemes(false); }}>
                    <Sparkles size={16} color="#f59e0b" />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Midnight Navy</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Azul profundo y Oro</span>
                    </div>
                  </div>
                  <div className="btn-nav" style={{ justifyContent: 'flex-start', background: theme === 'emerald' ? 'var(--primary-glow)' : '' }}
                    onClick={() => { setTheme('emerald'); setShowThemes(false); }}>
                    <Leaf size={16} color="#10b981" />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Emerald Forest</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Tonos verdes relajantes</span>
                    </div>
                  </div>
                  <div className="btn-nav" style={{ justifyContent: 'flex-start', marginBottom: '0.25rem', background: theme === 'forest' ? 'var(--primary-glow)' : '' }}
                    onClick={() => { setTheme('forest'); setShowThemes(false); }}>
                    <TreePine size={16} color="#064e3b" />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Deep Forest</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Contraste verde bosque</span>
                    </div>
                  </div>
                  <div className="btn-nav" style={{ justifyContent: 'flex-start', marginBottom: '0.25rem', background: theme === 'soft-gold' ? 'var(--primary-glow)' : '' }}
                    onClick={() => { setTheme('soft-gold'); setShowThemes(false); }}>
                    <CloudSun size={16} color="#d97706" />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Soft Gold</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Tonos cálidos y suaves</span>
                    </div>
                  </div>
                  <div className="btn-nav" style={{ justifyContent: 'flex-start', marginBottom: '0.25rem', background: theme === 'corporate' ? 'var(--primary-glow)' : '' }}
                    onClick={() => { setTheme('corporate'); setShowThemes(false); }}>
                    <Building2 size={16} color="#be185d" />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Corporate Elite</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Gris pizarra y Magenta</span>
                    </div>
                  </div>
                  <div className="btn-nav" style={{ justifyContent: 'flex-start', background: theme === 'earth' ? 'var(--primary-glow)' : '' }}
                    onClick={() => { setTheme('earth'); setShowThemes(false); }}>
                    <Mountain size={16} color="#78350f" />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Earth Modern</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Tonos tierra y crema</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <button className="header-action-btn" onClick={() => setShowProfiles(!showProfiles)}>
                <User size={18} /> <span>Perfiles</span> <ChevronDown size={14} />
              </button>
              {showProfiles && (
                <div className="glass-card" style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.5rem',
                  zIndex: 1000,
                  width: '240px',
                  padding: '0.5rem',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>PERFILES GUARDADOS</span>
                    <UserPlus size={14} className="icon-hover-primary" onClick={() => {
                      const name = prompt('Nombre del perfil:');
                      if (name) saveProfile(name);
                    }} />
                  </div>
                  {savedProfiles.map(profile => (
                    <div key={profile.id} className="btn-nav" style={{ justifyContent: 'space-between', paddingRight: '0.5rem', marginBottom: '0.25rem' }} onClick={() => { loadProfile(profile); setShowProfiles(false); }}>
                      <span style={{ fontSize: '0.85rem' }}>{profile.name}</span>
                      <Trash2 size={14} className="icon-hover-danger" onClick={(e) => { e.stopPropagation(); deleteProfile(profile.id); }} />
                    </div>
                  ))}
                  {savedProfiles.length === 0 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No hay perfiles</p>
                  )}
                </div>
              )}
            </div>

            <button className="header-action-btn" onClick={() => {
              const name = prompt('Nombre del perfil:');
              if (name) saveProfile(name);
            }}>
              <Save size={18} /> <span>Guardar Escenario</span>
            </button>
            <button className="header-action-btn primary" onClick={generatePDF}>
              <Download size={18} /> <span>Exportar Informe PDF</span>
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' && result && (
          <div className="grid-main">
            <div className="glass-card kpi-card">
              <div className="kpi-label" style={{ color: 'var(--text-muted)' }}>Líquido Mensual Trabajador</div>
              <div className="kpi-value" style={{ color: 'var(--text-main)' }}>{result.neto.toFixed(2)}€</div>
              <div className="status-badge status-success" style={{ alignSelf: 'center' }}>
                <CheckCircle2 size={14} /> Salario Neto Estimado
              </div>
            </div>
            <div className="glass-card kpi-card">
              <div className="kpi-label" style={{ color: 'var(--text-muted)' }}>Coste Total Empresa (Mes)</div>
              <div className="kpi-value" style={{ color: 'var(--text-main)' }}>{result.costeEmpresa.total.toFixed(2)}€</div>
              <div className="status-badge status-warning" style={{ alignSelf: 'center' }}>
                <Briefcase size={14} /> Incluye provisiones
              </div>
            </div>
            <div className="glass-card kpi-card">
              <div className="kpi-label">Coste Anual Proyectado</div>
              <div className="kpi-value" style={{ color: 'var(--primary)' }}>{result.costeEmpresa.anual.toFixed(2)}€</div>
              <div className="status-badge status-success" style={{ alignSelf: 'center' }}>
                <TrendingUp size={14} /> 12 meses + 4 pagas
              </div>
            </div>

            <div className="glass-card" style={{ gridColumn: '1 / -1' }}>
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LayoutDashboard size={20} color="var(--primary)" /> Análisis de Distribución del Gasto
              </h3>
              <div className="grid-main" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                <div>
                  <div className="progress-container">
                    <div className="progress-label">
                      <span>Salario Bruto ({((result.bruto / result.costeEmpresa.total) * 100).toFixed(1)}%)</span>
                      <span>{result.bruto.toFixed(2)}€</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${(result.bruto / result.costeEmpresa.total) * 100}%`, background: 'var(--primary)' }}></div>
                    </div>
                  </div>
                  <div className="progress-container">
                    <div className="progress-label">
                      <span>Cargas Sociales y Provisiones</span>
                      <span>{(result.costeEmpresa.total - result.bruto).toFixed(2)}€</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${((result.costeEmpresa.total - result.bruto) / result.costeEmpresa.total) * 100}%`, background: 'var(--warning)' }}></div>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={16} color="var(--success)" /> Salud Salarial (SMI)
                  </h4>
                  <div className="health-scale">
                    <div className="health-marker" style={{
                      width: `${Math.min(100, result.smiHealth)}%`,
                      background: result.smiHealth > 110 ? 'var(--success)' : (result.smiHealth > 100 ? 'var(--warning)' : 'var(--danger)')
                    }}></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: result.smiHealth < 100 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {result.smiHealth < 100 ? '¡BAJO SMI!' : 'Cumple SMI'}
                    </span>
                    <span style={{ fontWeight: 'bold' }}>{result.smiHealth.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* New Dashboard Row */}
            <div className="glass-card">
              <h4 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Timer size={18} color="var(--primary)" /> Antigüedad y Trienios
              </h4>
              <div className="countdown-box">
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>PRÓXIMO AUMENTO EN</div>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)' }}>{result.nextTrienio.mesesRestantes} MESES</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--primary)', marginTop: '0.5rem' }}>
                  +{result.nextTrienio.aumentoImporte.toFixed(2)}€ al mes
                </div>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem', fontStyle: 'italic' }}>
                Fecha prevista: {new Date(result.nextTrienio.fechaEfectiva).toLocaleDateString()}
              </p>
            </div>

            <div className="glass-card">
              <h4 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Briefcase size={18} color="var(--warning)" /> Desglose Seguridad Social
              </h4>
              <div className="metric-list">
                <div className="metric-item">
                  <span className="metric-label">Contingencias Comunes (23.6%)</span>
                  <span className="metric-value">{result.costeEmpresa.detailedSS.cc.toFixed(2)}€</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Desempleo/FOGASA/FP</span>
                  <span className="metric-value">{result.costeEmpresa.detailedSS.desempleo.toFixed(2)}€</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">MEI (0.7%)</span>
                  <span className="metric-value">{result.costeEmpresa.detailedSS.mei.toFixed(2)}€</span>
                </div>
              </div>
            </div>

            <div className="glass-card">
              <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Percent size={18} color="var(--primary)" /> Simulador de Jornada
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Ajusta para ver el impacto inmediato en costes y neto.
              </p>
              <input
                type="range"
                min="1"
                max="40"
                value={payrollInput.jornadaSemanal}
                className="simulator-range"
                onChange={(e) => handleInputChange({ target: { name: 'jornadaSemanal', value: e.target.value, type: 'number' } } as any)}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>1h</span>
                <span style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>{payrollInput.jornadaSemanal}h / semana</span>
                <span>40h</span>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'payroll' && (
          <div className="grid-simulator">
            <section className="glass-card">
              <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}><Calculator size={20} /> DATOS DEL EMPLEADO</h3>
              <div className="input-group">
                <label>Categoría Profesional</label>
                <select name="categoryId" value={payrollInput.categoryId} onChange={handleInputChange}>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="grid-main" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Jornada Semanal (h)</label>
                  <input type="number" name="jornadaSemanal" value={payrollInput.jornadaSemanal} onChange={handleInputChange} />
                </div>
                <div className="input-group">
                  <label>%Jornada</label>
                  <input type="number" value={(payrollInput.jornadaSemanal / 40 * 100).toFixed(2)} readOnly style={{ background: 'rgba(255,255,255,0.03)' }} />
                </div>
              </div>

              <div className="input-group">
                <label>Fecha de Alta</label>
                <input type="date" name="fechaAlta" value={payrollInput.fechaAlta} onChange={handleInputChange} />
              </div>

              <div className="grid-main" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>%IRPF Manual</label>
                  <input type="number" name="irpfManual" value={payrollInput.irpfManual} onChange={handleInputChange} />
                </div>
                <div className="input-group">
                  <label>Días Vacaciones (mes)</label>
                  <input type="number" name="diasVacaciones" value={payrollInput.diasVacaciones} onChange={handleInputChange} />
                </div>
              </div>

              <div className="input-group">
                <label>Nocturnidad Semanal</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="number" name="horasNocturnidad" placeholder="H" value={payrollInput.horasNocturnidad} onChange={handleInputChange} />
                  <input type="number" name="minutosNocturnidad" placeholder="Min" value={payrollInput.minutosNocturnidad} onChange={handleInputChange} max="59" />
                </div>
              </div>

              <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                <input type="checkbox" name="pagasProrrateadas" id="pagasProrrateadas" checked={payrollInput.pagasProrrateadas} onChange={handleInputChange} style={{ width: 'auto' }} />
                <label htmlFor="pagasProrrateadas" style={{ marginBottom: 0 }}>¿Prorratear Pagas Extras?</label>
              </div>

              <div style={{ marginTop: '2rem' }}>
                <h4 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Planificador Visual (Turnos/Vacaciones)</h4>
                <div className="calendar-grid">
                  {Array.from({ length: 31 }).map((_, i) => (
                    <div
                      key={i}
                      className={`calendar-day ${calendarDays[i + 1] === 'night' ? 'active-night' : ''}${calendarDays[i + 1] === 'vacation' ? 'active-vacation' : ''}`}
                      onClick={() => toggleDay(i + 1)}
                    >
                      {i + 1}
                      {calendarDays[i + 1] === 'night' && <div className="day-marker marker-night" />}
                      {calendarDays[i + 1] === 'vacation' && <div className="day-marker marker-vacation" />}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div className="day-marker marker-night" style={{ position: 'relative', bottom: 'auto' }} /> Nocturnidad
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div className="day-marker marker-vacation" style={{ position: 'relative', bottom: 'auto' }} /> Vacaciones
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '2rem', padding: '1.25rem', background: 'rgba(59,130,246,0.03)', borderRadius: '16px', border: '1px solid var(--primary-glow)' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UserPlus size={16} /> Conceptos Personalizados (Mejoras/Incentivos)
                </h4>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input
                    type="text"
                    placeholder="Ejem: Mejora Voluntaria"
                    value={newExtra.name}
                    onChange={(e) => setNewExtra({ ...newExtra, name: e.target.value })}
                    style={{ flex: 2 }}
                  />
                  <input
                    type="number"
                    placeholder="Importe"
                    value={newExtra.amount}
                    onChange={(e) => setNewExtra({ ...newExtra, amount: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn-primary"
                    style={{ padding: '0.5rem 1rem' }}
                    onClick={() => {
                      if (newExtra.name && newExtra.amount) {
                        setPayrollInput({
                          ...payrollInput,
                          extraDevengos: [...(payrollInput.extraDevengos || []), { name: newExtra.name, amount: parseFloat(newExtra.amount) }]
                        });
                        setNewExtra({ name: '', amount: '' });
                      }
                    }}
                  >
                    Añadir
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(payrollInput.extraDevengos || []).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.85rem' }}>{item.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontWeight: '600', color: 'var(--success)' }}>{item.amount.toFixed(2)}€</span>
                        <Trash2
                          size={14}
                          className="icon-hover-danger"
                          onClick={() => {
                            setPayrollInput({
                              ...payrollInput,
                              extraDevengos: payrollInput.extraDevengos?.filter((_, i) => i !== idx)
                            });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="glass-card">
              <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}><FileText size={20} /> PREVISIÓN DE NÓMINA</h3>
              {result && (
                <table className="payroll-table">
                  <thead>
                    <tr>
                      <th>Concepto</th>
                      <th style={{ textAlign: 'right' }}>Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.devengos.map((d, i) => (
                      <tr key={i} className={d.concept.includes('DIF SMI') ? 'row-highlight' : ''}>
                        <td>{d.concept}</td>
                        <td style={{ textAlign: 'right' }}>{d.amount.toFixed(2)}€</td>
                      </tr>
                    ))}
                    <tr style={{ background: 'var(--primary-glow)' }}>
                      <td><strong style={{ color: 'var(--primary)' }}>TOTAL BRUTO</strong></td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--primary)' }}>{result.bruto.toFixed(2)}€</td>
                    </tr>
                    <tr style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      <td>Base de Cotización</td>
                      <td style={{ textAlign: 'right' }}>{result.baseCotizacion.toFixed(2)}€</td>
                    </tr>
                    {result.deducciones.map((d, i) => (
                      <tr key={i}>
                        <td style={{ color: 'var(--danger)' }}>{d.concept}</td>
                        <td style={{ textAlign: 'right', color: 'var(--danger)' }}>-{d.amount.toFixed(2)}€</td>
                      </tr>
                    ))}
                    <tr className="row-highlight" style={{ fontSize: '1.25rem' }}>
                      <td><strong style={{ color: 'var(--primary)' }}>LÍQUIDO A PERCIBIR</strong></td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--primary)' }}>{result.neto.toFixed(2)}€</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </section>
          </div>
        )
        }


        {
          activeTab === 'consultas' && (
            <section className="glass-card">
              <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
                <FileText size={20} /> CONSULTAS DEL CONVENIO
              </h3>

              <div style={{
                display: 'flex',
                background: 'rgba(0,0,0,0.05)',
                borderRadius: '12px',
                padding: '4px',
                marginBottom: '2.5rem',
                border: '1px solid var(--border)'
              }}>
                <button
                  onClick={() => setConsultasSubTab('licencias')}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: consultasSubTab === 'licencias' ? 'var(--primary)' : 'transparent',
                    color: consultasSubTab === 'licencias' ? '#fff' : 'var(--text-muted)',
                    fontWeight: '600',
                    transition: 'var(--transition)',
                    cursor: 'pointer'
                  }}
                >
                  Licencias Retribuidas
                </button>
                <button
                  onClick={() => setConsultasSubTab('calculadora')}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: consultasSubTab === 'calculadora' ? 'var(--primary)' : 'transparent',
                    color: consultasSubTab === 'calculadora' ? '#fff' : 'var(--text-muted)',
                    fontWeight: '600',
                    transition: 'var(--transition)',
                    cursor: 'pointer'
                  }}
                >
                  Calculadora Vacaciones
                </button>
                <button
                  onClick={() => setConsultasSubTab('resumen')}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: consultasSubTab === 'resumen' ? 'var(--primary)' : 'transparent',
                    color: consultasSubTab === 'resumen' ? '#fff' : 'var(--text-muted)',
                    fontWeight: '600',
                    transition: 'var(--transition)',
                    cursor: 'pointer'
                  }}
                >
                  Resumen del Convenio
                </button>
              </div>

              {consultasSubTab === 'licencias' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <h4 style={{ marginBottom: '1.25rem', color: 'var(--primary)' }}>Permisos y Licencias (Art. 33)</h4>
                  <div className="input-group">
                    <input
                      type="text"
                      placeholder="Buscar por concepto (matrimonio, hospitalización, fallecimiento...)"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '1.25rem',
                    padding: '0.5rem 0'
                  }}>
                    {filteredLicencias.length > 0 ? (
                      filteredLicencias.map((l, i) => (
                        <div key={i} className="glass-card" style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid var(--border)',
                          padding: '1.5rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                          transition: 'all 0.3s ease'
                        }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.borderColor = 'var(--primary)';
                            e.currentTarget.style.background = 'rgba(59,130,246,0.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.borderColor = 'var(--border)';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                          }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h5 title={l.concepto} style={{ color: 'var(--text-main)', fontSize: '1.05rem', fontWeight: '600', margin: 0, paddingRight: '1rem', flex: 1 }}>{l.concepto}</h5>
                            <div style={{
                              background: 'var(--primary-glow)',
                              color: 'var(--primary)',
                              padding: '0.35rem 0.75rem',
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                              fontWeight: '700',
                              whiteSpace: 'nowrap',
                              border: '1px solid rgba(59,130,246,0.2)'
                            }}>
                              {l.dias}
                            </div>
                          </div>
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                            {l.nota}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No se han encontrado licencias que coincidan con la búsqueda.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {consultasSubTab === 'calculadora' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <div className="glass-card" style={{ background: 'var(--primary-glow)', border: '1px solid var(--primary)', maxWidth: '800px', margin: '0 auto' }}>
                    <h4 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                      <Calculator size={18} /> Calculadora de Vacaciones Devengadas
                    </h4>
                    <div className="grid-main" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                      <div className="input-group">
                        <label>Base de Cálculo</label>
                        <select value={vacDaysPerYear} onChange={(e) => setVacDaysPerYear(parseInt(e.target.value))}>
                          <option value={34}>34 días (Provincial Tenerife)</option>
                          <option value={30}>30 días (Estatuto Trabajadores)</option>
                        </select>
                      </div>
                      <div className="input-group">
                        <label>Fecha Inicio</label>
                        <input type="date" value={vacStart} onChange={(e) => setVacStart(e.target.value)} />
                      </div>
                      <div className="input-group">
                        <label>Fecha Fin</label>
                        <input type="date" value={vacEnd} onChange={(e) => setVacEnd(e.target.value)} />
                      </div>
                    </div>
                    {vacResult !== null && (
                      <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', textAlign: 'center' }}>
                        <span className="kpi-label">Crédito de Vacaciones</span>
                        <div style={{ fontSize: '2.25rem', fontWeight: '800', color: 'var(--primary)' }}>
                          {vacResult.toFixed(2)} días
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {consultasSubTab === 'resumen' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <h4 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Resumen por Capítulos del Convenio</h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '3rem'
                  }}>
                    {resumenConvenio.map((c, i) => (
                      <div key={i} className="glass-card" style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border)',
                        padding: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        transition: 'all 0.3s ease'
                      }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--primary)';
                          e.currentTarget.style.background = 'rgba(59,130,246,0.03)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                            fontWeight: '800'
                          }}>
                            {c.capitulo}
                          </div>
                          <h5 style={{ color: 'var(--text-main)', fontSize: '1rem', fontWeight: '700', margin: 0 }}>{c.titulo}</h5>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
                          {c.resumen}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="grid-main" style={{ marginTop: '2.5rem' }}>
                    <div className="glass-card" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid var(--primary-glow)' }}>
                      <h4 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Jornada y Vacaciones</h4>
                      <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        <li>Jornada máxima semanal: 40 horas.</li>
                        <li>Vacaciones: 34 días naturales al año (Provincial Tenerife).</li>
                        <li>Bolsa de vacaciones: Se abona íntegra en el mes de disfrute inicial.</li>
                      </ul>
                    </div>
                    <div className="glass-card" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid var(--primary-glow)' }}>
                      <h4 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Antigüedad</h4>
                      <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        <li>Cálculo por trienios (cada 3 años).</li>
                        <li>Valor por trienio: 4%del salario base de la categoría actual.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )
        }

        {
          activeTab === 'config' && (
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Settings size={20} /> CONFIGURACIÓN DEL SISTEMA
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 0 }}>Año de Vigencia:</label>
                  <select
                    value={activeYear}
                    onChange={(e) => setActiveYear(e.target.value)}
                    style={{
                      padding: '0.4rem 1rem',
                      borderRadius: '8px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--primary)',
                      color: 'var(--text-main)',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    {Object.keys(defaultData.years).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                    <option value="2026">2026 (Nuevo)</option>
                  </select>
                </div>
              </div>
              <div className="grid-main" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                <section>
                  <h4 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Parámetros Generales</h4>
                  <div className="input-group">
                    <label>SMI Anual Vigente (€)</label>
                    <input type="number" step="0.01" value={config.smiAnual} onChange={(e) => setConfig({ ...config, smiAnual: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="input-group">
                    <label>Seguridad Social Empresa (%)</label>
                    <input type="number" step="0.0001" value={config.ssEmpresa} onChange={(e) => setConfig({ ...config, ssEmpresa: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="input-group">
                    <label>Seguridad Social Trabajador (%)</label>
                    <input type="number" step="0.0001" value={config.ssTrabajador} onChange={(e) => setConfig({ ...config, ssTrabajador: parseFloat(e.target.value) || 0 })} />
                  </div>
                </section>


                <section style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem' }}>
                  <h4 style={{ color: 'var(--warning)', marginBottom: '0.5rem' }}>Acciones de Sistema</h4>
                  <button className="btn-primary" onClick={handleSaveConfig} style={{ width: '100%' }}>
                    <Save size={18} /> Guardar Cambios Manualmente
                  </button>
                  <button className="btn-nav" onClick={handleResetConfig} style={{ width: '100%', border: '1px solid rgba(255,100,100,0.2)', color: '#ff8080' }}>
                    Restaurar Valores por Defecto
                  </button>
                  {saveStatus === 'success' && (
                    <div style={{ color: 'var(--success)', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.5rem', fontWeight: 'bold' }}>
                      ✓ ¡Configuración guardada en el navegador!
                    </div>
                  )}
                </section>
              </div>

              <h4 style={{ marginTop: '2.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>Tablas Salariales por Categoría</h4>
              <div style={{ overflowX: 'auto' }}>
                <table className="payroll-table" style={{ minWidth: '900px' }}>
                  <thead>
                    <tr>
                      <th>Categoría</th>
                      <th>Sal. Base</th>
                      <th>Pl. Convenio</th>
                      <th>Pl. Distancia</th>
                      <th>Iguala</th>
                      <th>Bolsa Vac.</th>
                      <th>P. Extra Base</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No hay ninguna categoría configurada. Pulsa "Restaurar" para cargar las de 2025.
                        </td>
                      </tr>
                    )}
                    {categories.map((cat, idx) => (
                      <tr key={cat.id}>
                        <td><input value={cat.nombre} title={cat.nombre} style={{ width: '100%' }} onChange={(e) => {
                          const newCats = [...categories];
                          newCats[idx].nombre = e.target.value;
                          setCategories(newCats);
                        }} /></td>
                        <td><input type="number" step="0.01" value={cat.salarioBase} onChange={(e) => {
                          const newCats = [...categories];
                          newCats[idx].salarioBase = parseFloat(e.target.value) || 0;
                          setCategories(newCats);
                        }} /></td>
                        <td><input type="number" step="0.01" value={cat.plusConvenio} onChange={(e) => {
                          const newCats = [...categories];
                          newCats[idx].plusConvenio = parseFloat(e.target.value) || 0;
                          setCategories(newCats);
                        }} /></td>
                        <td><input type="number" step="0.01" value={cat.plusDistancia} onChange={(e) => {
                          const newCats = [...categories];
                          newCats[idx].plusDistancia = parseFloat(e.target.value) || 0;
                          setCategories(newCats);
                        }} /></td>
                        <td><input type="number" step="0.01" value={cat.iguala} onChange={(e) => {
                          const newCats = [...categories];
                          newCats[idx].iguala = parseFloat(e.target.value) || 0;
                          setCategories(newCats);
                        }} /></td>
                        <td><input type="number" step="0.01" value={cat.bolsa} onChange={(e) => {
                          const newCats = [...categories];
                          newCats[idx].bolsa = parseFloat(e.target.value) || 0;
                          setCategories(newCats);
                        }} /></td>
                        <td><input type="number" step="0.01" value={cat.pagasExtras} onChange={(e) => {
                          const newCats = [...categories];
                          newCats[idx].pagasExtras = parseFloat(e.target.value) || 0;
                          setCategories(newCats);
                        }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button className="btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => {
                  const id = `cat-${Date.now()}`;
                  setCategories([...categories, { id, nombre: 'Nueva Categoría', salarioBase: 0, plusConvenio: 0, plusDistancia: 0, iguala: 0, bolsa: 0, pagasExtras: 0 }]);
                }}>
                  <Settings size={18} /> Añadir Nueva Categoría
                </button>
              </div>
            </div>
          )
        }

        {
          activeTab === 'costs' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <TrendingUp size={24} color="var(--primary)" /> ANÁLISIS DE COSTES DE EMPRESA
                </h3>
              </div>
              {result && (
                <div className="grid-main">
                  <div>
                    <table className="payroll-table">
                      <tbody>
                        <tr>
                          <td>Salario Bruto Mensual</td>
                          <td style={{ textAlign: 'right' }}>{result.bruto.toFixed(2)}€</td>
                        </tr>
                        <tr>
                          <td>Seguridad Social Empresa (Total)</td>
                          <td style={{ textAlign: 'right' }}>{result.costeEmpresa.seguridadSocial.toFixed(2)}€</td>
                        </tr>
                        <tr style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <td style={{ paddingLeft: '2rem' }}>• Contingencias Comunes</td>
                          <td style={{ textAlign: 'right' }}>{result.costeEmpresa.detailedSS.cc.toFixed(2)}€</td>
                        </tr>
                        <tr style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <td style={{ paddingLeft: '2rem' }}>• Desempleo / IT / FOGASA / FP</td>
                          <td style={{ textAlign: 'right' }}>{result.costeEmpresa.detailedSS.desempleo.toFixed(2)}€</td>
                        </tr>
                        <tr style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <td style={{ paddingLeft: '2rem' }}>• MEI (Mecanismo Equidad)</td>
                          <td style={{ textAlign: 'right' }}>{result.costeEmpresa.detailedSS.mei.toFixed(2)}€</td>
                        </tr>
                        <tr>
                          <td>Provisión Indemnización (3%)</td>
                          <td style={{ textAlign: 'right' }}>{result.costeEmpresa.indemnizacionProp.toFixed(2)}€</td>
                        </tr>
                        <tr className="row-highlight">
                          <td><strong style={{ color: 'var(--primary)' }}>COSTE TOTAL MENSUAL</strong></td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--primary)' }}>{result.costeEmpresa.total.toFixed(2)}€</td>
                        </tr>
                        <tr style={{ background: 'var(--primary-glow)' }}>
                          <td><strong style={{ color: 'var(--primary)' }}>COSTE TOTAL ANUAL</strong></td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--primary)' }}>{result.costeEmpresa.anual.toFixed(2)}€</td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '15px', border: '1px solid var(--border)' }}>
                      <h4 style={{ color: 'var(--warning)', marginBottom: '1rem', fontSize: '0.9rem' }}>Gastos de Gestión e Indirectos (Estimaciones)</h4>
                      <div className="metric-list">
                        <div className="metric-item">
                          <span className="metric-label">PRL, Uniformes y Formación</span>
                          <span className="metric-value">45.00€ / mes</span>
                        </div>
                        <div className="metric-item">
                          <span className="metric-label">Seguros y Gestión Laboral</span>
                          <span className="metric-value">12.00€ / mes</span>
                        </div>
                        <div className="metric-item" style={{ borderTop: '1px solid var(--border)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                          <span className="metric-label"><strong>COSTE EXTERNO TOTAL</strong></span>
                          <span className="metric-value"><strong>{(result.costeEmpresa.total + 57).toFixed(2)}€</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '2rem', background: 'rgba(59,130,246,0.03)', borderRadius: '20px', border: '1px solid var(--primary-glow)' }}>
                    <h4 style={{ marginBottom: '1.5rem', color: 'var(--primary)', fontWeight: '700' }}>MÉTRICAS DE RENDIMIENTO</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div className="metric-item">
                        <span className="metric-label">Coste hora efectivo (aprox.)</span>
                        <span className="metric-value">{(result.costeEmpresa.total / (payrollInput.jornadaSemanal * 4.33)).toFixed(2)}€/h</span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">Factor multiplicador bruto</span>
                        <span className="metric-value">{(result.costeEmpresa.total / result.bruto).toFixed(2)}x</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        }

        {
          activeTab === 'comparison' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <TrendingUp size={24} color="var(--primary)" /> COMPARATIVA DE CATEGORÍAS
                    </h3>
                  </div>
                  {selectedComparisonIds.length > 0 && (
                    <button
                      className="btn-nav"
                      onClick={() => setSelectedComparisonIds([])}
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                    >
                      Desmarcar todas ({selectedComparisonIds.length})
                    </button>
                  )}
                </div>
              </div>

              {selectedComparisonIds.length >= 2 && (
                <div className="glass-card" style={{ marginBottom: '2.5rem' }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={selectedComparisonIds.map(id => {
                      const cat = categories.find(c => c.id === id);
                      if (!cat) return null;
                      const res = calculatePayroll({ ...payrollInput, categoryId: cat.id }, cat, config);
                      return { name: cat.nombre, Bruto: res.bruto, Neto: res.neto, Coste: res.costeEmpresa.total };
                    }).filter(Boolean)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          borderRadius: '12px',
                          color: 'var(--text-main)',
                          boxShadow: 'var(--shadow-lg)'
                        }}
                        itemStyle={{ color: 'var(--text-main)' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px', color: 'var(--text-main)' }} />
                      <Bar dataKey="Bruto" fill="var(--warning)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Neto" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Coste" fill="var(--text-muted)" opacity={0.3} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="grid-main">
                {categories.map(cat => {
                  const res = calculatePayroll({ ...payrollInput, categoryId: cat.id }, cat, config);
                  const isSelected = selectedComparisonIds.includes(cat.id);
                  return (
                    <div
                      key={cat.id}
                      className="glass-card comparison-card"
                      style={{ border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)' }}
                      onClick={() => isSelected ? setSelectedComparisonIds(selectedComparisonIds.filter(id => id !== cat.id)) : setSelectedComparisonIds([...selectedComparisonIds, cat.id])}
                    >
                      <h4 style={{ color: 'var(--text-main)' }}>{cat.nombre}</h4>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--primary)' }}>{res.neto.toFixed(2)}€ <small>Neto</small></div>
                      <div className="metric-list">
                        <div className="metric-item"><span>Bruto</span><span>{res.bruto.toFixed(2)}€</span></div>
                        <div className="metric-item"><span>Coste</span><span>{res.costeEmpresa.total.toFixed(2)}€</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        }

        {
          activeTab === 'tenders' && (
            <div className="grid-simulator">
              <section className="glass-card">
                <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                  <ClipboardList size={20} /> CONFIGURACIÓN DE LICITACIÓN
                </h3>

                <div className="input-group">
                  <label>Título / Referencia del Concurso</label>
                  <input
                    type="text"
                    value={tendersData.label}
                    onChange={(e) => setTendersData({ ...tendersData, label: e.target.value })}
                  />
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>EQUIPO DE TRABAJO</h4>
                    <button className="btn-primary" onClick={addWorker} style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}>
                      <UserPlus size={14} /> Añadir Personal
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {tendersData.workers.map((worker) => (
                      <div key={worker.id} className="glass-card" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '0.75rem', alignItems: 'end' }}>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.7rem' }}>Categoría</label>
                            <select
                              value={worker.categoryId}
                              onChange={(e) => updateWorker(worker.id, { categoryId: e.target.value })}
                              style={{ padding: '0.4rem' }}
                            >
                              {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                              ))}
                            </select>
                          </div>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.7rem' }}>Cantidad</label>
                            <input
                              type="number"
                              value={worker.count}
                              onChange={(e) => updateWorker(worker.id, { count: parseInt(e.target.value) || 0 })}
                              style={{ padding: '0.4rem' }}
                            />
                          </div>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.7rem' }}>Jornada (h)</label>
                            <input
                              type="number"
                              value={worker.jornada}
                              onChange={(e) => updateWorker(worker.id, { jornada: parseInt(e.target.value) || 0 })}
                              style={{ padding: '0.4rem' }}
                            />
                          </div>
                          <button
                            className="icon-hover-danger"
                            style={{ background: 'none', border: 'none', paddingBottom: '0.5rem' }}
                            onClick={() => removeWorker(worker.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {tendersData.workers.length === 0 && (
                      <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', padding: '1rem' }}>No hay personal asignado</p>
                    )}
                  </div>
                </div>

                <div className="grid-main" style={{ marginTop: '2rem', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label>Materiales y Suministros (€/mes)</label>
                    <input type="number" value={tendersData.materials} onChange={(e) => setTendersData({ ...tendersData, materials: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="input-group">
                    <label>Maquinaria y Amortiz. (€/mes)</label>
                    <input type="number" value={tendersData.machinery} onChange={(e) => setTendersData({ ...tendersData, machinery: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>

                <div className="grid-main" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label>Gastos Generales (%)</label>
                    <input type="number" value={tendersData.overheadPercent} onChange={(e) => setTendersData({ ...tendersData, overheadPercent: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="input-group">
                    <label>Beneficio Industrial (%)</label>
                    <input type="number" value={tendersData.profitPercent} onChange={(e) => setTendersData({ ...tendersData, profitPercent: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>

                <div className="input-group">
                  <label>Tipo de Impuesto Aplicable</label>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: 0 }}>
                      <input type="radio" checked={tendersData.taxType === 'IGIC'} onChange={() => setTendersData({ ...tendersData, taxType: 'IGIC' })} style={{ width: 'auto' }} />
                      <span>IGIC (7%) - Canarias</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: 0 }}>
                      <input type="radio" checked={tendersData.taxType === 'IVA'} onChange={() => setTendersData({ ...tendersData, taxType: 'IVA' })} style={{ width: 'auto' }} />
                      <span>IVA (21%) - General</span>
                    </label>
                  </div>
                </div>
              </section>

              <section className="glass-card">
                <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>📊 RESUMEN ECONÓMICO</h3>
                {(() => {
                  let laborCostTotal = 0;
                  tendersData.workers.forEach(w => {
                    const cat = categories.find(c => c.id === w.categoryId) || categories[0];
                    if (cat) {
                      const payroll = calculatePayroll({ ...payrollInput, categoryId: w.categoryId, jornadaSemanal: w.jornada }, cat, config);
                      laborCostTotal += payroll.costeEmpresa.total * w.count;
                    }
                  });

                  const directCosts = laborCostTotal + tendersData.materials + tendersData.machinery + tendersData.otherCosts;
                  const overhead = directCosts * (tendersData.overheadPercent / 100);
                  const industrialBenefit = directCosts * (tendersData.profitPercent / 100);
                  const baseImponible = directCosts + overhead + industrialBenefit;
                  const taxRate = tendersData.taxType === 'IGIC' ? 0.07 : 0.21;
                  const taxAmount = baseImponible * taxRate;
                  const totalBid = baseImponible + taxAmount;

                  return (
                    <div>
                      <div className="metric-list" style={{ marginBottom: '2rem' }}>
                        <div className="metric-item">
                          <span className="metric-label">Coste de Personal (Mensual)</span>
                          <span className="metric-value">{laborCostTotal.toFixed(2)}€</span>
                        </div>
                        <div className="metric-item">
                          <span className="metric-label">Otros Costes Directos</span>
                          <span className="metric-value">{(tendersData.materials + tendersData.machinery).toFixed(2)}€</span>
                        </div>
                        <div className="metric-item" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                          <span className="metric-label">Gastos Generales ({tendersData.overheadPercent}%)</span>
                          <span className="metric-value">{overhead.toFixed(2)}€</span>
                        </div>
                        <div className="metric-item">
                          <span className="metric-label">Beneficio Industrial ({tendersData.profitPercent}%)</span>
                          <span className="metric-value">{industrialBenefit.toFixed(2)}€</span>
                        </div>
                        <div className="metric-item">
                          <span className="metric-label">Base Imponible</span>
                          <span className="metric-value" style={{ fontWeight: 'bold' }}>{baseImponible.toFixed(2)}€</span>
                        </div>
                        <div className="metric-item">
                          <span className="metric-label">{tendersData.taxType} ({tendersData.taxType === 'IGIC' ? '7%' : '21%'})</span>
                          <span className="metric-value">{taxAmount.toFixed(2)}€</span>
                        </div>
                      </div>

                      <div className="glass-card" style={{ background: 'var(--primary-glow)', border: '1px solid var(--primary)', textAlign: 'center' }}>
                        <div className="kpi-label" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>PRECIO OFERTA TÉCNICA (MES)</div>
                        <div className="kpi-value" style={{ fontSize: '2.5rem' }}>{totalBid.toFixed(2)}€</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                          Anualizado: {(totalBid * 12).toFixed(2)}€
                        </div>
                      </div>

                      <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,150,0,0.05)', borderRadius: '12px', border: '1px solid var(--warning)' }}>
                        <h4 style={{ fontSize: '0.8rem', color: 'var(--warning)', marginBottom: '0.5rem' }}>Notas de Licitación</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                          El coste de personal incluye todas las provisiones (extras, vacaciones, indemnización) calculadas automáticamente según el convenio seleccionado.
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </section>
            </div>
          )
        }
        {
          activeTab === 'finiquito' && result && (
            <div className="grid-simulator">
              <section className="glass-card">
                <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>📌 DATOS DE LA BAJA</h3>
                <div className="input-group">
                  <label>Fecha Efectiva de Baja</label>
                  <input
                    type="date"
                    value={finiquitoInput.fechaBaja}
                    onChange={(e) => setFiniquitoInput({ ...finiquitoInput, fechaBaja: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Fecha de Alta (Para Indemnización)</label>
                  <input
                    type="date"
                    value={finiquitoInput.fechaAlta}
                    onChange={(e) => setFiniquitoInput({ ...finiquitoInput, fechaAlta: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Vacaciones No Disfrutadas (Días)</label>
                  <input
                    type="number"
                    value={finiquitoInput.vacacionesPendientes}
                    onChange={(e) => setFiniquitoInput({ ...finiquitoInput, vacacionesPendientes: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="input-group" style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <input
                      type="checkbox"
                      id="checkIndem"
                      checked={finiquitoInput.incluirIndemnizacion}
                      onChange={(e) => setFiniquitoInput({ ...finiquitoInput, incluirIndemnizacion: e.target.checked })}
                    />
                    <label htmlFor="checkIndem" style={{ marginBottom: 0 }}>¿Incluir Indemnización?</label>
                  </div>

                  {finiquitoInput.incluirIndemnizacion && (
                    <div className="input-group" style={{ paddingLeft: '2rem', borderLeft: '2px solid var(--primary)' }}>
                      <label>Días por Año trabajados</label>
                      <select
                        value={finiquitoInput.diasIndemnizacion}
                        onChange={(e) => setFiniquitoInput({ ...finiquitoInput, diasIndemnizacion: parseInt(e.target.value) })}
                      >
                        <option value={12}>12 días (Fin de contrato temporal)</option>
                        <option value={20}>20 días (Económico/Objetivo)</option>
                        <option value={33}>33 días (Improcedente)</option>
                        <option value={45}>45 días (Legado/Antiguo)</option>
                      </select>
                    </div>
                  )}
                </div>
              </section>

              <section className="glass-card">
                <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>💰 LIQUIDACIÓN ESTIMADA</h3>
                {(() => {
                  const category = categories.find(c => c.id === payrollInput.categoryId) || categories[0];
                  const sev = calculateSeverance(finiquitoInput, result, category);
                  return (
                    <div>
                      <div className="metric-list" style={{ marginBottom: '2rem' }}>
                        <div className="metric-item">
                          <span className="metric-label">Antigüedad Calculada</span>
                          <span className="metric-value">{sev.antiguedadAnos.toFixed(2)} años</span>
                        </div>
                        <div className="metric-item">
                          <span className="metric-label">Vacaciones Liquidadas ({sev.diasVacaciones} días)</span>
                          <span className="metric-value">{sev.importeVacaciones.toFixed(2)}€</span>
                        </div>
                        {sev.prorrataPagas.map((p, i) => (
                          <div className="metric-item" key={i}>
                            <span className="metric-label">{p.concept}</span>
                            <span className="metric-value">{p.amount.toFixed(2)}€</span>
                          </div>
                        ))}
                        {sev.indemnizacion > 0 && (
                          <div className="metric-item">
                            <span className="metric-label">Indemnización ({finiquitoInput.diasIndemnizacion} días/año)</span>
                            <span className="metric-value" style={{ color: 'var(--success)' }}>{sev.indemnizacion.toFixed(2)}€</span>
                          </div>
                        )}
                      </div>
                      <div className="glass-card" style={{ background: 'var(--primary-glow)', border: '1px solid var(--primary)' }}>
                        <div className="kpi-label" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>TOTAL LÍQUIDO A PERCIBIR</div>
                        <div className="kpi-value" style={{ fontSize: '2.5rem' }}>{sev.totalLiquido.toFixed(2)}€</div>
                      </div>
                    </div>
                  );
                })()}
              </section>
            </div>
          )
        }
      </main>
    </div >
  );
};

export default App;
