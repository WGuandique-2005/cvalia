'use strict';
/* ==========================================================================
   CValia — datos de demostración (100% ficticios, fines académicos).
   Prototipo conceptual NO funcional · Laboratorio 2 — Bloque 3.
   ========================================================================== */

const BRAND = {
  name: 'CValia',
  tagline: 'Evaluación de talento tecnológico con criterio explicable.',
  version: 'Prototipo conceptual v0.9 · No funcional',
};

/* Niveles de dominio de habilidad (1–4) con factor de coincidencia. */
const LEVELS = { 1: 'Básico', 2: 'Intermedio', 3: 'Avanzado', 4: 'Experto' };
const LEVEL_FACTOR = { 1: 0.4, 2: 0.6, 3: 0.85, 4: 1 };

/* --------------------------------------------------------------------------
   Vacantes: requerimientos ponderados (w = peso 1–5) definidos por el área
   de talento + líder técnico. Es la "verdad terreno" contra la que se evalúa.
   -------------------------------------------------------------------------- */
const VACANCIES = [
  {
    id: 'backend-sr', title: 'Backend Developer', seniority: 'Senior', expYears: 4,
    summary: 'Evolución de servicios de pagos y conciliación.',
    reqs: [
      { skill: 'Java', w: 5 }, { skill: 'Spring Boot', w: 4 }, { skill: 'APIs REST', w: 3 },
      { skill: 'PostgreSQL', w: 4 }, { skill: 'Docker', w: 3 }, { skill: 'AWS', w: 3 },
      { skill: 'CI/CD', w: 2 }, { skill: 'Git', w: 2 }, { skill: 'Microservicios', w: 2 },
    ],
  },
  {
    id: 'frontend', title: 'Frontend Developer', seniority: 'Mid-level', expYears: 2,
    summary: 'Producto web de autoservicio para clientes.',
    reqs: [
      { skill: 'React', w: 5 }, { skill: 'TypeScript', w: 4 }, { skill: 'CSS avanzado', w: 3 },
      { skill: 'Testing (Jest/Vitest)', w: 2 }, { skill: 'Git', w: 2 },
      { skill: 'Accesibilidad (a11y)', w: 2 }, { skill: 'Node.js', w: 2 },
    ],
  },
  {
    id: 'data-sci', title: 'Data Scientist', seniority: 'Mid-level', expYears: 2,
    summary: 'Modelos de riesgo y analítica de producto.',
    reqs: [
      { skill: 'Python', w: 5 }, { skill: 'SQL', w: 4 }, { skill: 'Estadística', w: 3 },
      { skill: 'Machine Learning', w: 3 }, { skill: 'pandas', w: 3 }, { skill: 'Visualización de datos', w: 2 },
    ],
  },
  {
    id: 'devops', title: 'DevOps Engineer', seniority: 'Mid-level', expYears: 3,
    summary: 'Plataforma de despliegue, IaC y observabilidad.',
    reqs: [
      { skill: 'AWS', w: 4 }, { skill: 'Docker', w: 4 }, { skill: 'Kubernetes', w: 4 },
      { skill: 'Terraform', w: 3 }, { skill: 'CI/CD', w: 4 }, { skill: 'Linux', w: 3 },
      { skill: 'Observabilidad', w: 2 },
    ],
  },
  {
    id: 'qa', title: 'QA Automation', seniority: 'Junior / Mid', expYears: 2,
    summary: 'Calidad de producto web y APIs internas.',
    reqs: [
      { skill: 'Testing E2E', w: 4 }, { skill: 'Automatización de pruebas', w: 4 },
      { skill: 'Testing de APIs', w: 3 }, { skill: 'SQL', w: 2 }, { skill: 'CI/CD', w: 2 }, { skill: 'Git', w: 2 },
    ],
  },
];

/* --------------------------------------------------------------------------
   Perfiles de ejemplo: personas ficticias con CV ya estructurado.
   El prototipo nunca procesa un archivo real; si el usuario carga un PDF,
   se simula el análisis con uno de estos perfiles.
   -------------------------------------------------------------------------- */
const PROFILES = {
  ana: {
    id: 'ana', name: 'Ana Torres', fileName: 'ana_torres_cv.pdf',
    years: 6, eduLevel: 'grado', edu: 'Ingeniería en Sistemas — universidad nacional',
    skills: [
      { name: 'Java', level: 3 }, { name: 'Spring Boot', level: 3 }, { name: 'APIs REST', level: 3 },
      { name: 'PostgreSQL', level: 3 }, { name: 'Docker', level: 2 }, { name: 'AWS', level: 2 },
      { name: 'CI/CD', level: 3 }, { name: 'Git', level: 3 }, { name: 'Microservicios', level: 3 },
    ],
    certs: ['AWS Certified Developer – Associate', 'Scrum Foundation'],
    languages: ['Inglés B2'], oss: true,
    lastRoles: [
      { title: 'Backend Developer', org: 'Fintech (250–500 empleados)', period: '2022 — actualidad' },
      { title: 'Backend Developer Jr', org: 'Consultora de software', period: '2019 — 2022' },
    ],
    flags: [],
  },
  carlos: {
    id: 'carlos', name: 'Carlos Mendoza', fileName: 'carlos_mendoza_cv.pdf',
    years: 3, eduLevel: 'grado', edu: 'Licenciatura en Computación — universidad privada',
    skills: [
      { name: 'React', level: 4 }, { name: 'TypeScript', level: 3 }, { name: 'CSS avanzado', level: 3 },
      { name: 'Testing (Jest/Vitest)', level: 2 }, { name: 'Git', level: 3 },
      { name: 'Accesibilidad (a11y)', level: 1 }, { name: 'Node.js', level: 2 },
      { name: 'APIs REST', level: 3 }, { name: 'PostgreSQL', level: 2 }, { name: 'Docker', level: 1 }, { name: 'CI/CD', level: 1 },
    ],
    certs: ['Meta Front-End Developer'], languages: ['Inglés B1'], oss: true,
    lastRoles: [
      { title: 'Frontend Developer', org: 'Agencia digital', period: '2023 — actualidad' },
      { title: 'Desarrollador web Jr', org: 'Comercio electrónico local', period: '2022 — 2023' },
    ],
    flags: ['Tres cambios de empleo en 24 meses: validar motivación y estabilidad en entrevista.'],
  },
  lucia: {
    id: 'lucia', name: 'Lucía Herrera', fileName: 'lucia_herrera_cv.pdf',
    years: 1.5, eduLevel: 'tecnico', edu: 'Técnico en Desarrollo de Software',
    skills: [
      { name: 'Python', level: 2 }, { name: 'SQL', level: 2 }, { name: 'Estadística', level: 1 },
      { name: 'Visualización de datos', level: 2 }, { name: 'pandas', level: 1 }, { name: 'Git', level: 2 },
    ],
    certs: ['Google Data Analytics'], languages: ['Inglés B2'], oss: false,
    lastRoles: [
      { title: 'Analista de datos Jr', org: 'Compañía de seguros', period: '2024 — actualidad' },
    ],
    flags: ['Experiencia por debajo del rango solicitado para la vacante.'],
  },
  sofia: {
    id: 'sofia', name: 'Sofía Contreras', fileName: 'sofia_contreras_cv.pdf',
    years: 5, eduLevel: 'grado', edu: 'Ingeniería en Ciencias de la Computación',
    skills: [
      { name: 'APIs REST', level: 3 }, { name: 'PostgreSQL', level: 2 }, { name: 'Docker', level: 3 },
      { name: 'AWS', level: 2 }, { name: 'CI/CD', level: 3 }, { name: 'Git', level: 3 },
      { name: 'Microservicios', level: 2 }, { name: 'Kubernetes', level: 2 }, { name: 'Linux', level: 3 }, { name: 'Go', level: 4 },
    ],
    certs: ['Certified Kubernetes Application Developer'], languages: ['Inglés B2'], oss: true,
    lastRoles: [
      { title: 'Platform Engineer', org: 'Startup SaaS B2B', period: '2021 — actualidad' },
      { title: 'Backend Developer', org: 'Banco nacional — área digital', period: '2019 — 2021' },
    ],
    flags: [],
  },
  daniel: {
    id: 'daniel', name: 'Daniel Quintanilla', fileName: 'daniel_quintanilla_cv.pdf',
    years: 2, eduLevel: 'tecnico', edu: 'Técnico en Redes y Sistemas Operativos',
    skills: [
      { name: 'AWS', level: 1 }, { name: 'Docker', level: 2 }, { name: 'Linux', level: 3 },
      { name: 'CI/CD', level: 2 }, { name: 'Git', level: 3 },
    ],
    certs: [], languages: [], oss: false,
    lastRoles: [
      { title: 'Soporte de infraestructura', org: 'Proveedor de servicios gestionados', period: '2023 — actualidad' },
    ],
    flags: [],
  },
  andres: {
    id: 'andres', name: 'Andrés Rivera', fileName: 'andres_rivera_cv.pdf',
    years: 3, eduLevel: 'grado', edu: 'Ingeniería en Desarrollo de Software',
    skills: [
      { name: 'Testing E2E', level: 3 }, { name: 'Automatización de pruebas', level: 4 },
      { name: 'Testing de APIs', level: 2 }, { name: 'SQL', level: 1 }, { name: 'CI/CD', level: 2 }, { name: 'Git', level: 3 },
    ],
    certs: ['ISTQB Foundation Level'], languages: ['Inglés A2'], oss: false,
    lastRoles: [
      { title: 'QA Analyst', org: 'Consultora de software', period: '2022 — actualidad' },
    ],
    flags: [],
  },
  valeria: {
    id: 'valeria', name: 'Valeria Sorto', fileName: 'valeria_sorto_cv.pdf',
    years: 4, eduLevel: 'maestria', edu: 'Maestría en Ciencia de Datos',
    skills: [
      { name: 'Python', level: 4 }, { name: 'SQL', level: 3 }, { name: 'Estadística', level: 3 },
      { name: 'Machine Learning', level: 3 }, { name: 'pandas', level: 4 },
      { name: 'Visualización de datos', level: 2 }, { name: 'Git', level: 3 },
    ],
    certs: ['TensorFlow Developer Certificate'], languages: ['Inglés C1'], oss: true,
    lastRoles: [
      { title: 'Data Scientist', org: 'Compañía de telecomunicaciones', period: '2022 — actualidad' },
      { title: 'Data Analyst', org: 'Fintech (50–100 empleados)', period: '2021 — 2022' },
    ],
    flags: [],
  },
};

/* CVs de ejemplo ofrecidos en la vista de evaluación. */
const SAMPLE_CVS = ['ana', 'carlos', 'lucia', 'sofia'];

/* --------------------------------------------------------------------------
   Semillas: evaluaciones ya procesadas que pueblan la vista de candidatos.
   El puntaje se recalcula en runtime con evaluate() — mismas reglas que la
   simulación en vivo, para que el mundo demo sea consistente.
   Las fechas se generan relativas a "hoy" para que la demo luzca vigente.
   -------------------------------------------------------------------------- */
function daysAgo(n, hour) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, Math.floor(Math.random() * 50) + 5, 0, 0);
  return d.toISOString();
}
const SEEDS = [
  { id: 'TS-0131', profileId: 'ana', vacancyId: 'backend-sr', date: daysAgo(6, 10), source: 'ejemplo',
    decision: { status: 'entrevista', by: 'M. Rivas · Talento', at: daysAgo(6, 11), note: 'Coincidencia alta con el stack del equipo. Agendar entrevista técnica.' } },
  { id: 'TS-0132', profileId: 'carlos', vacancyId: 'frontend', date: daysAgo(5, 9), source: 'ejemplo', decision: null },
  { id: 'TS-0133', profileId: 'daniel', vacancyId: 'devops', date: daysAgo(5, 16), source: 'archivo',
    decision: { status: 'descartado', by: 'M. Rivas · Talento', at: daysAgo(4, 9), note: 'Sin Kubernetes ni IaC: no cubre los requerimientos clave de la vacante.' } },
  { id: 'TS-0134', profileId: 'sofia', vacancyId: 'backend-sr', date: daysAgo(3, 11), source: 'archivo', decision: null },
  { id: 'TS-0135', profileId: 'andres', vacancyId: 'qa', date: daysAgo(2, 14), source: 'ejemplo', decision: null },
  { id: 'TS-0136', profileId: 'valeria', vacancyId: 'data-sci', date: daysAgo(1, 9), source: 'archivo', decision: null },
];

/* Registro de auditoría (semilla). El prototipo agrega entradas en vivo. */
const LOG_SEED = [
  { ts: daysAgo(7, 9), actor: 'Sistema', ev: 'Auditoría de paridad trimestral ejecutada — sin señales de sesgo.' },
  { ts: daysAgo(7, 14), actor: 'Sistema', ev: 'Modelo de scoring v2.3 desplegado. Variación media de puntajes: 0.8%.' },
  { ts: daysAgo(6, 10), actor: 'Sistema', ev: 'Evaluación TS-0131 generada (Backend Developer Sr).' },
  { ts: daysAgo(6, 11), actor: 'M. Rivas · Talento', ev: 'Decisión registrada sobre TS-0131: entrevista aprobada.' },
  { ts: daysAgo(4, 9), actor: 'M. Rivas · Talento', ev: 'Decisión registrada sobre TS-0133: descartado con motivo.' },
  { ts: daysAgo(1, 8), actor: 'Comité de IA', ev: 'Revisión de pesos de la vacante Data Scientist (sin cambios).' },
];

/* --------------------------------------------------------------------------
   Plan de cumplimiento — Ley de Fomento a la Inteligencia Artificial
   de El Salvador. Contenido ficticio con fines de demostración académica.
   -------------------------------------------------------------------------- */
const COMPLIANCE = {
  ley: 'Ley de Fomento a la Inteligencia Artificial de El Salvador',
  risk: {
    level: 'Medio',
    scope: 'Ámbito de uso: preselección de candidatos (acceso a empleo).',
    autonomy: 'Autonomía: el sistema no emite decisiones vinculantes; recomienda y siempre requiere decisión humana registrada.',
    justification: [
      'El sistema influye en un ámbito sensible: el acceso a oportunidades de empleo.',
      'Sin embargo, opera como herramienta de apoyo: recomienda, no descarta. Los factores y pesos son públicos y cada evaluación es explicable.',
      'Toda decisión adversa (descarte o brecha crítica) exige revisión y firma humana, con evidencia en el registro de auditoría.',
    ],
  },
  cards: [
    {
      icon: 'users', tag: 'M-05', title: 'Supervisión humana',
      points: [
        'Responsables: Líder de Talento (operativa) y Comité de IA (estratégica).',
        'Revisión obligatoria: todo descarte, puntaje menor a 55 y cualquier alerta de sesgo.',
        'Evidencia: cada decisión se registra con autor, fecha y nota; el registro es exportable.',
      ],
    },
    {
      icon: 'eye', tag: 'M-03', title: 'Transparencia y explicabilidad',
      points: [
        'Aviso al candidato en la postulación: su CV será evaluado con apoyo de un sistema de IA supervisado.',
        'Factores y pesos publicados en cada vacante; reporte individual con desglose por factor.',
        'Limitaciones declaradas: el puntaje resume señales del CV; no certifica competencia técnica.',
      ],
    },
    {
      icon: 'activity', tag: 'M-04', title: 'Gestión de riesgos',
      points: [
        'Registro de riesgos vivo, con responsable y mitigación por cada riesgo identificado.',
        'Auditoría trimestral: paridad demográfica, precisión top-5 y deriva del modelo.',
        'Interruptor de pausa: el sistema puede detenerse sin afectar la operación manual.',
      ],
    },
    {
      icon: 'shield-check', tag: 'DATOS', title: 'Protección de datos personales',
      points: [
        'Anonimización antes del scoring: nombre, contacto, género, edad y fotografía se remueven.',
        'La identidad se revela únicamente al registrar una decisión humana.',
        'Cifrado en tránsito y en reposo; retención máxima de 90 días con borrado programado.',
      ],
    },
    {
      icon: 'scale', tag: 'RESP', title: 'Responsabilidad ante fallos',
      points: [
        'Titulares: Oficial de Protección de Datos (datos) y Comité de IA (modelo).',
        'Incidentes: contención inmediata y comunicación a los afectados en un máximo de 72 horas.',
        'Corrección: reproceso manual del caso afectado y ajuste documentado del modelo.',
      ],
    },
    {
      icon: 'refresh-cw', tag: 'MEJORA', title: 'Mejora continua',
      points: [
        'Revisión semestral de pesos y umbrales, validada con muestreo humano.',
        'Capacitación anual del equipo de reclutamiento en uso responsable de la herramienta.',
        'Actualización de esta documentación ante cambios normativos aplicables.',
      ],
    },
  ],
  risks: [
    { name: 'Sesgo algorítmico contra grupos protegidos', prob: 'Media', imp: 'Alto',
      mitigation: 'Anonimización previa al scoring + auditoría de paridad trimestral + revisión humana obligatoria.',
      owner: 'Comité de IA' },
    { name: 'Falsos negativos (candidato válido descartado)', prob: 'Alta', imp: 'Alto',
      mitigation: 'Explicabilidad por factor, umbral de revisión humana bajo 55 y búsqueda activa en paralelo.',
      owner: 'Líder de Talento' },
    { name: 'Fuga o mal manejo de datos personales', prob: 'Baja', imp: 'Alto',
      mitigation: 'Cifrado, principio de mínimo acceso, retención de 90 días y rol de Oficial de Protección de Datos.',
      owner: 'Oficial de P. de Datos' },
    { name: 'Dependencia excesiva del modelo (automatización de sesgo organizacional)', prob: 'Media', imp: 'Medio',
      mitigation: 'Capacitación, regla explícita "recomendación ≠ decisión" y métricas de uso del panel.',
      owner: 'Comité de IA' },
    { name: 'Deriva del modelo por evolución del mercado tecnológico', prob: 'Media', imp: 'Medio',
      mitigation: 'Reentrenamiento semestral y validación por muestreo humano sobre evaluaciones recientes.',
      owner: 'Equipo de Datos' },
  ],
  incident: [
    { step: 'Detección', text: 'Canal interno + alertas automáticas del módulo de auditoría (M-04).' },
    { step: 'Contención', text: 'Pausa del modelo; las evaluaciones en cola pasan a revisión manual.' },
    { step: 'Corrección', text: 'Reproceso del caso, ajuste documentado del modelo y reporte al afectado en ≤ 72 h.' },
  ],
};
