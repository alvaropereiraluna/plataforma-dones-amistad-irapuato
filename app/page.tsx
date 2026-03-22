"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BarChart3, ClipboardCheck, Cloud, Database, FileText, Layers3, Search, UserPlus } from "lucide-react"

type FunctionalDimension = "inclinacion" | "disfrute" | "confirmacion" | "fruto"
type SpiritualDimension = "sensibilidad" | "fruto" | "confirmacion"

type FunctionalQuestion = {
  id: string
  gift: string
  text: string
  dimension: FunctionalDimension
  order: number
}

type SpiritualQuestion = {
  id: string
  gift: string
  text: string
  dimension: SpiritualDimension
  order: number
}

type Profile = {
  id: number
  full_name: string
  age: number | null
  sex: string | null
  church: string | null
  service_areas: string | null
  created_at?: string
  updated_at?: string
}

type Evaluation = {
  profile_id: number
  functional_answers: Record<string, number | "">
  spiritual_answers: Record<string, number | "">
  completed_functional?: boolean
  completed_spiritual?: boolean
  updated_at?: string
}

type Group = {
  id: number
  name: string
  memberIds: number[]
  created_at?: string
}

type PeerRecognition = {
  id: string
  from_profile_id: number
  to_profile_id: number
  gifts: string[]
  created_at?: string
}

type AppState = {
  profiles: Profile[]
  evaluations: Record<number, Evaluation>
  groups: Group[]
  peerRecognitions: PeerRecognition[]
  nextProfileId: number
  nextGroupId: number
}

type ConnectionState = {
  connected: boolean
  mode: "local" | "supabase"
  message: string
}

const FUNCTIONAL_GIFTS = [
  "Enseñanza",
  "Liderazgo",
  "Servicio",
  "Misericordia",
  "Exhortación",
  "Evangelismo",
  "Fe",
  "Discernimiento",
  "Profecía",
  "Generosidad",
  "Pastoreo",
  "Sabiduría",
] as const

const SPIRITUAL_GIFTS = [
  "Palabra de conocimiento",
  "Sanidades",
  "Milagros",
  "Lenguas",
  "Interpretación de lenguas",
  "Apostólico (envío)",
  "Ayudas",
  "Administración",
  "Intercesión",
  "Discernimiento espiritual avanzado",
] as const

const ALL_GIFTS = [...FUNCTIONAL_GIFTS, ...SPIRITUAL_GIFTS]

const FUNCTIONAL_DIMENSION_LABELS: Record<FunctionalDimension, string> = {
  inclinacion: "Inclinación",
  disfrute: "Disfrute",
  confirmacion: "Confirmación",
  fruto: "Fruto",
}

const SPIRITUAL_DIMENSION_LABELS: Record<SpiritualDimension, string> = {
  sensibilidad: "Sensibilidad",
  fruto: "Fruto",
  confirmacion: "Confirmación",
}

const FUNCTIONAL_QUESTION_BANK: Record<string, { text: string; dimension: FunctionalDimension }[]> = {
  Enseñanza: [
    {
      text: "Cuando una persona no entiende una verdad bíblica o un tema importante, siento carga por explicarlo de forma clara y ordenada.",
      dimension: "inclinacion",
    },
    {
      text: "Disfruto estudiar, estructurar y transmitir conocimiento para que otros comprendan mejor un tema.",
      dimension: "disfrute",
    },
    {
      text: "Con frecuencia otras personas me buscan para que les aclare dudas o les ayude a entender algo paso a paso.",
      dimension: "confirmacion",
    },
    {
      text: "Si debo preparar una explicación o clase, normalmente encuentro facilidad para organizar ideas y comunicar con sentido.",
      dimension: "fruto",
    },
  ],
  Liderazgo: [
    {
      text: "Cuando un grupo está desorganizado o sin dirección, naturalmente empiezo a ordenar, orientar y mover a las personas hacia una meta.",
      dimension: "inclinacion",
    },
    {
      text: "Me siento cómodo tomando responsabilidad para coordinar personas, tiempos o tareas cuando hace falta avanzar.",
      dimension: "disfrute",
    },
    {
      text: "Otras personas suelen seguir mis indicaciones o buscar mi dirección cuando hay que tomar decisiones o definir rumbo.",
      dimension: "confirmacion",
    },
    {
      text: "Disfruto ver cómo un equipo crece, se ordena y cumple objetivos cuando hay una conducción clara.",
      dimension: "fruto",
    },
  ],
  Servicio: [
    {
      text: "Cuando veo una necesidad práctica, mi impulso es ayudar de inmediato aunque nadie me lo pida.",
      dimension: "inclinacion",
    },
    {
      text: "Me siento realizado cuando apoyo tareas concretas que facilitan el trabajo o el bienestar de otros.",
      dimension: "disfrute",
    },
    {
      text: "Con frecuencia participo resolviendo asuntos prácticos, operativos o logísticos sin buscar protagonismo.",
      dimension: "confirmacion",
    },
    {
      text: "Las personas suelen reconocer en mí disposición constante para ayudar, colaborar y atender necesidades reales.",
      dimension: "fruto",
    },
  ],
  Misericordia: [
    {
      text: "Cuando veo a alguien herido, vulnerable o en sufrimiento, siento una carga profunda por acompañarlo y aliviar su dolor.",
      dimension: "inclinacion",
    },
    {
      text: "Me resulta natural acercarme con compasión, paciencia y sensibilidad a personas que están pasando por momentos difíciles.",
      dimension: "disfrute",
    },
    {
      text: "Otros suelen percibir en mí empatía genuina y capacidad para consolar sin juzgar duramente.",
      dimension: "confirmacion",
    },
    {
      text: "Disfruto restaurar, cuidar y sostener emocional o espiritualmente a personas que necesitan apoyo.",
      dimension: "fruto",
    },
  ],
  Exhortación: [
    {
      text: "Cuando alguien está estancado, desanimado o desviado, siento impulso por animarlo, corregirlo y ayudarlo a avanzar.",
      dimension: "inclinacion",
    },
    {
      text: "Me es natural hablar con claridad para motivar, fortalecer o llamar a una persona a responder correctamente.",
      dimension: "disfrute",
    },
    {
      text: "Con frecuencia mis palabras ayudan a otros a reaccionar, tomar decisiones o perseverar en medio de la dificultad.",
      dimension: "confirmacion",
    },
    {
      text: "Disfruto acompañar procesos de crecimiento personal o espiritual ayudando a otros a dar el siguiente paso.",
      dimension: "fruto",
    },
  ],
  Evangelismo: [
    {
      text: "Siento carga por compartir el mensaje de salvación con personas que aún no conocen a Cristo.",
      dimension: "inclinacion",
    },
    {
      text: "Me resulta natural iniciar conversaciones espirituales o presentar el evangelio de forma sencilla y directa.",
      dimension: "disfrute",
    },
    {
      text: "Con frecuencia identifico oportunidades para hablar de Jesús y animar a otros a responder a la fe.",
      dimension: "confirmacion",
    },
    {
      text: "Disfruto ver a personas acercarse a Dios, interesarse por el evangelio o tomar decisiones espirituales.",
      dimension: "fruto",
    },
  ],
  Fe: [
    {
      text: "Cuando otros dudan o ven imposible una situación, dentro de mí suele permanecer una confianza firme en que Dios puede actuar.",
      dimension: "inclinacion",
    },
    {
      text: "Me resulta natural sostener esperanza, orar con convicción y permanecer firme aun cuando no hay evidencias visibles.",
      dimension: "disfrute",
    },
    {
      text: "Otras personas encuentran ánimo o estabilidad en mi manera de confiar en Dios en medio de procesos difíciles.",
      dimension: "confirmacion",
    },
    {
      text: "Disfruto asumir retos espirituales o ministeriales confiando en la provisión y respaldo de Dios.",
      dimension: "fruto",
    },
  ],
  Discernimiento: [
    {
      text: "Con frecuencia percibo diferencias entre lo auténtico y lo engañoso en personas, ambientes, mensajes o decisiones.",
      dimension: "inclinacion",
    },
    {
      text: "Cuando algo no está bien, suelo identificarlo internamente aun antes de tener toda la información visible.",
      dimension: "disfrute",
    },
    {
      text: "Otras personas buscan mi opinión para evaluar si una situación, propuesta o influencia es sana o no.",
      dimension: "confirmacion",
    },
    {
      text: "Disfruto ayudar a filtrar, evaluar y distinguir con sabiduría lo que conviene de lo que debe evitarse.",
      dimension: "fruto",
    },
  ],
  Profecía: [
    {
      text: "Siento carga por expresar con verdad y valentía lo que Dios demanda o lo que una situación necesita escuchar.",
      dimension: "inclinacion",
    },
    {
      text: "Me resulta natural confrontar lo incorrecto, señalar desvíos o llamar a una respuesta alineada con la voluntad de Dios.",
      dimension: "disfrute",
    },
    {
      text: "Con frecuencia mis palabras producen conciencia, convicción o claridad espiritual en otros.",
      dimension: "confirmacion",
    },
    {
      text: "Disfruto comunicar mensajes directos, pertinentes y espiritualmente incisivos cuando es necesario.",
      dimension: "fruto",
    },
  ],
  Generosidad: [
    {
      text: "Cuando detecto una necesidad, me nace compartir recursos, tiempo o bienes para suplirla con alegría.",
      dimension: "inclinacion",
    },
    {
      text: "Me resulta natural dar sin sentir que pierdo, especialmente cuando percibo que eso bendice o impulsa a otros.",
      dimension: "disfrute",
    },
    {
      text: "Otras personas suelen reconocer en mí disposición abierta para contribuir materialmente o sostener causas valiosas.",
      dimension: "confirmacion",
    },
    {
      text: "Disfruto sembrar recursos en personas, proyectos o necesidades con sentido de propósito y gratitud.",
      dimension: "fruto",
    },
  ],
  Pastoreo: [
    {
      text: "Siento carga por cuidar, acompañar y dar seguimiento continuo al crecimiento de personas o grupos.",
      dimension: "inclinacion",
    },
    {
      text: "Me resulta natural interesarme por el estado espiritual, emocional y práctico de otros de forma constante.",
      dimension: "disfrute",
    },
    {
      text: "Con frecuencia las personas me buscan para consejo, cuidado, acompañamiento o dirección cercana.",
      dimension: "confirmacion",
    },
    {
      text: "Disfruto ver procesos de madurez, protección y restauración sostenidos en personas que acompaño.",
      dimension: "fruto",
    },
  ],
  Sabiduría: [
    {
      text: "Cuando surgen problemas complejos, suelo ver conexiones, caminos de solución y aplicaciones prácticas que otros no perciben fácilmente.",
      dimension: "inclinacion",
    },
    {
      text: "Me resulta natural traducir principios espirituales o conocimientos en decisiones útiles, prudentes y oportunas.",
      dimension: "disfrute",
    },
    {
      text: "Otras personas buscan mi consejo cuando necesitan claridad para decidir correctamente en situaciones difíciles.",
      dimension: "confirmacion",
    },
    {
      text: "Disfruto aportar perspectiva, criterio y dirección práctica que ayude a resolver asuntos con equilibrio y madurez.",
      dimension: "fruto",
    },
  ],
}

const SPIRITUAL_QUESTION_BANK: Record<string, { text: string; dimension: SpiritualDimension }[]> = {
  "Palabra de conocimiento": [
    { text: "Percibo información puntual que ayuda a entender la situación de una persona o asunto más allá de lo evidente.", dimension: "sensibilidad" },
    { text: "Cuando comparto una impresión específica, suele traer claridad o dirección útil.", dimension: "fruto" },
    { text: "Otros han confirmado que ciertas percepciones mías eran precisas y oportunas.", dimension: "confirmacion" },
  ],
  Sanidades: [
    { text: "Siento carga por orar por enfermos y esperar intervención de Dios.", dimension: "sensibilidad" },
    { text: "Mi oración por salud o restauración suele traer consuelo, mejoría o esperanza concreta.", dimension: "fruto" },
    { text: "Otras personas han reconocido respaldo especial cuando intercedo por sanidad.", dimension: "confirmacion" },
  ],
  Milagros: [
    { text: "Creo y pido por intervenciones extraordinarias de Dios ante situaciones humanamente imposibles.", dimension: "sensibilidad" },
    { text: "He visto respuestas inusuales o notables al orar o actuar en fe.", dimension: "fruto" },
    { text: "Otros han confirmado que Dios ha obrado de manera fuera de lo común en contextos donde participé.", dimension: "confirmacion" },
  ],
  Lenguas: [
    { text: "Tengo sensibilidad para expresar oración o alabanza espiritual más allá del lenguaje común.", dimension: "sensibilidad" },
    { text: "Esta expresión suele edificar mi vida espiritual y fortalecer mi comunión con Dios.", dimension: "fruto" },
    { text: "En contextos apropiados y ordenados, otros han reconocido este fluir espiritual.", dimension: "confirmacion" },
  ],
  "Interpretación de lenguas": [
    { text: "Percibo sentido o dirección al escuchar una expresión espiritual en lenguas.", dimension: "sensibilidad" },
    { text: "Cuando comparto la interpretación, suele aportar edificación o claridad al grupo.", dimension: "fruto" },
    { text: "Otros han confirmado que mi interpretación fue coherente y de bendición.", dimension: "confirmacion" },
  ],
  "Apostólico (envío)": [
    { text: "Siento impulso por abrir obra, iniciar proyectos y establecer estructuras para avanzar.", dimension: "sensibilidad" },
    { text: "Cuando emprendo algo nuevo, suelo generar orden, expansión o envío de personas.", dimension: "fruto" },
    { text: "Otros han reconocido capacidad en mí para establecer, alinear y lanzar iniciativas.", dimension: "confirmacion" },
  ],
  Ayudas: [
    { text: "Percibo con facilidad dónde apoyar para que una obra o equipo funcione mejor.", dimension: "sensibilidad" },
    { text: "Mi ayuda práctica suele sostener y facilitar el avance de otros de manera tangible.", dimension: "fruto" },
    { text: "Los demás suelen confirmar que mi apoyo ha sido clave y oportuno.", dimension: "confirmacion" },
  ],
  Administración: [
    { text: "Tengo sensibilidad para ordenar recursos, procesos y personas con sentido estratégico.", dimension: "sensibilidad" },
    { text: "Cuando organizo, las cosas suelen fluir con más claridad, estructura y eficacia.", dimension: "fruto" },
    { text: "Otros suelen reconocer en mí habilidad para administrar y dar gobierno sano.", dimension: "confirmacion" },
  ],
  Intercesión: [
    { text: "Siento carga persistente por orar profundamente por personas, situaciones o procesos.", dimension: "sensibilidad" },
    { text: "Mi intercesión suele traer paz, dirección o avances que otros terminan reconociendo.", dimension: "fruto" },
    { text: "Otras personas han confirmado en mí una carga especial y sostenida de oración.", dimension: "confirmacion" },
  ],
  "Discernimiento espiritual avanzado": [
    { text: "Percibo con claridad la atmósfera espiritual o el origen de ciertas influencias en una situación.", dimension: "sensibilidad" },
    { text: "Cuando comparto mi discernimiento, suele ayudar a tomar decisiones más seguras y correctas.", dimension: "fruto" },
    { text: "Otros han confirmado que mis observaciones espirituales fueron acertadas y útiles.", dimension: "confirmacion" },
  ],
}

const FUNCTIONAL_QUESTIONS: FunctionalQuestion[] = FUNCTIONAL_GIFTS.flatMap((gift, giftIndex) =>
  FUNCTIONAL_QUESTION_BANK[gift].map((q, questionIndex) => ({
    id: `F-${giftIndex + 1}-${questionIndex + 1}`,
    gift,
    text: q.text,
    dimension: q.dimension,
    order: questionIndex + 1,
  })),
)

const SPIRITUAL_QUESTIONS: SpiritualQuestion[] = SPIRITUAL_GIFTS.flatMap((gift, giftIndex) =>
  SPIRITUAL_QUESTION_BANK[gift].map((q, questionIndex) => ({
    id: `S-${giftIndex + 1}-${questionIndex + 1}`,
    gift,
    text: q.text,
    dimension: q.dimension,
    order: questionIndex + 1,
  })),
)

const STORAGE_KEY = "plataforma-dones-amistad-irapuato-v4"

const SQL_SCHEMA = `create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id bigint generated by default as identity primary key,
  full_name text not null,
  age integer,
  sex text,
  church text,
  service_areas text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  profile_id bigint references public.profiles(id) on delete cascade,
  functional_answers jsonb not null default '{}'::jsonb,
  spiritual_answers jsonb not null default '{}'::jsonb,
  completed_functional boolean default false,
  completed_spiritual boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(profile_id)
);

create table if not exists public.groups (
  id bigint generated by default as identity primary key,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists public.group_members (
  id bigint generated by default as identity primary key,
  group_id bigint references public.groups(id) on delete cascade,
  profile_id bigint references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(group_id, profile_id)
);

create table if not exists public.peer_recognitions (
  id uuid primary key default gen_random_uuid(),
  from_profile_id bigint references public.profiles(id) on delete cascade,
  to_profile_id bigint references public.profiles(id) on delete cascade,
  gifts text[] not null default '{}',
  created_at timestamptz default now(),
  unique(from_profile_id, to_profile_id)
);

alter table public.profiles enable row level security;
alter table public.evaluations enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.peer_recognitions enable row level security;

drop policy if exists "open access demo profiles" on public.profiles;
drop policy if exists "open access demo evaluations" on public.evaluations;
drop policy if exists "open access demo groups" on public.groups;
drop policy if exists "open access demo group_members" on public.group_members;
drop policy if exists "open access demo peer_recognitions" on public.peer_recognitions;

create policy "open access demo profiles" on public.profiles for all using (true) with check (true);
create policy "open access demo evaluations" on public.evaluations for all using (true) with check (true);
create policy "open access demo groups" on public.groups for all using (true) with check (true);
create policy "open access demo group_members" on public.group_members for all using (true) with check (true);
create policy "open access demo peer_recognitions" on public.peer_recognitions for all using (true) with check (true);`

function buildEmptyState(): AppState {
  return {
    profiles: [],
    evaluations: {},
    groups: [],
    peerRecognitions: [],
    nextProfileId: 1,
    nextGroupId: 1,
  }
}

function blankFunctionalAnswers(): Record<string, number | ""> {
  return Object.fromEntries(FUNCTIONAL_QUESTIONS.map((q) => [q.id, ""]))
}

function blankSpiritualAnswers(): Record<string, number | ""> {
  return Object.fromEntries(SPIRITUAL_QUESTIONS.map((q) => [q.id, ""]))
}

function average(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
}

function topNFromScores(scoreMap: Record<string, number>, n = 3) {
  return Object.entries(scoreMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, score]) => ({ name, score }))
}

function getScoreLabel(score: number, max: number) {
  const pct = max > 0 ? score / max : 0
  if (pct >= 0.8) return "Muy fuerte"
  if (pct >= 0.65) return "Fuerte"
  if (pct >= 0.5) return "Consistente"
  if (pct >= 0.3) return "En desarrollo"
  return "Bajo"
}

function getSemaphore(pct: number) {
  if (pct >= 0.8) return "Verde"
  if (pct >= 0.6) return "Amarillo"
  if (pct > 0) return "Rojo"
  return "Sin datos"
}

function getReliability(answered: number, total: number) {
  const pct = total ? answered / total : 0
  if (pct >= 1) return "Alta"
  if (pct >= 0.75) return "Media"
  if (pct > 0) return "Baja"
  return "Sin datos"
}

function computeFunctionalEvaluation(raw?: Partial<Evaluation>) {
  const answers = raw?.functional_answers || {}
  const scores = Object.fromEntries(FUNCTIONAL_GIFTS.map((g) => [g, 0])) as Record<string, number>
  const dimensionsByGift = Object.fromEntries(
    FUNCTIONAL_GIFTS.map((g) => [
      g,
      {
        inclinacion: 0,
        disfrute: 0,
        confirmacion: 0,
        fruto: 0,
      },
    ]),
  ) as Record<string, Record<FunctionalDimension, number>>

  const globalDimensions: Record<FunctionalDimension, number[]> = {
    inclinacion: [],
    disfrute: [],
    confirmacion: [],
    fruto: [],
  }

  FUNCTIONAL_QUESTIONS.forEach((q) => {
    const value = Number(answers[q.id] || 0)
    scores[q.gift] += value
    dimensionsByGift[q.gift][q.dimension] += value
    globalDimensions[q.dimension].push(value)
  })

  const answered = FUNCTIONAL_QUESTIONS.filter((q) => answers[q.id] !== "" && answers[q.id] != null).length
  const maturityPct = Object.values(scores).reduce((a, b) => a + b, 0) / (FUNCTIONAL_GIFTS.length * 20)

  return {
    answered,
    total: FUNCTIONAL_QUESTIONS.length,
    completionPct: answered / FUNCTIONAL_QUESTIONS.length,
    reliability: getReliability(answered, FUNCTIONAL_QUESTIONS.length),
    maturityPct,
    semaphore: getSemaphore(maturityPct),
    scores,
    top3: topNFromScores(scores, 3),
    dimensionsByGift,
    globalDimensions: {
      inclinacion: average(globalDimensions.inclinacion) / 5,
      disfrute: average(globalDimensions.disfrute) / 5,
      confirmacion: average(globalDimensions.confirmacion) / 5,
      fruto: average(globalDimensions.fruto) / 5,
    },
  }
}

function computeSpiritualEvaluation(raw?: Partial<Evaluation>) {
  const answers = raw?.spiritual_answers || {}
  const scores = Object.fromEntries(SPIRITUAL_GIFTS.map((g) => [g, 0])) as Record<string, number>

  const dimensionsByGift = Object.fromEntries(
    SPIRITUAL_GIFTS.map((g) => [
      g,
      {
        sensibilidad: 0,
        fruto: 0,
        confirmacion: 0,
      },
    ]),
  ) as Record<string, Record<SpiritualDimension, number>>

  const globalDimensions: Record<SpiritualDimension, number[]> = {
    sensibilidad: [],
    fruto: [],
    confirmacion: [],
  }

  SPIRITUAL_QUESTIONS.forEach((q) => {
    const value = Number(answers[q.id] || 0)
    scores[q.gift] += value
    dimensionsByGift[q.gift][q.dimension] += value
    globalDimensions[q.dimension].push(value)
  })

  const answered = SPIRITUAL_QUESTIONS.filter((q) => answers[q.id] !== "" && answers[q.id] != null).length
  const maturityPct = Object.values(scores).reduce((a, b) => a + b, 0) / (SPIRITUAL_GIFTS.length * 15)

  return {
    answered,
    total: SPIRITUAL_QUESTIONS.length,
    completionPct: answered / SPIRITUAL_QUESTIONS.length,
    reliability: getReliability(answered, SPIRITUAL_QUESTIONS.length),
    maturityPct,
    semaphore: getSemaphore(maturityPct),
    scores,
    top3: topNFromScores(scores, 3),
    dimensionsByGift,
    globalDimensions: {
      sensibilidad: average(globalDimensions.sensibilidad) / 5,
      fruto: average(globalDimensions.fruto) / 5,
      confirmacion: average(globalDimensions.confirmacion) / 5,
    },
  }
}

function recognitionSummaryForUser(userId: number, recognitions: PeerRecognition[]) {
  const rows = recognitions.filter((r) => Number(r.to_profile_id) === Number(userId))
  const counts = Object.fromEntries(ALL_GIFTS.map((g) => [g, 0])) as Record<string, number>

  rows.forEach((r) => {
    ;(r.gifts || []).forEach((gift) => {
      counts[gift] = (counts[gift] || 0) + 1
    })
  })

  return {
    totalRecognizers: [...new Set(rows.map((r) => r.from_profile_id))].length,
    counts,
    top: topNFromScores(counts, 22),
  }
}

function buildGroupReport(
  group: Group,
  profiles: Profile[],
  evaluations: Record<number, Evaluation>,
  recognitions: PeerRecognition[],
) {
  const members = profiles.filter((p) => group.memberIds.includes(p.id))
  const completeMembers = members.filter((p) => {
    const ev = evaluations[p.id] || {}
    return computeFunctionalEvaluation(ev).answered === 48 && computeSpiritualEvaluation(ev).answered === 30
  })

  const functionalAgg = Object.fromEntries(FUNCTIONAL_GIFTS.map((g) => [g, 0])) as Record<string, number>
  const spiritualAgg = Object.fromEntries(SPIRITUAL_GIFTS.map((g) => [g, 0])) as Record<string, number>
  const allAgg = Object.fromEntries(ALL_GIFTS.map((g) => [g, 0])) as Record<string, number>
  const confirmations = Object.fromEntries(ALL_GIFTS.map((g) => [g, 0])) as Record<string, number>
  const reliabilities: Record<string, number> = { Alta: 0, Media: 0, Baja: 0, "Sin datos": 0 }
  const semaphores: Record<string, number> = { Verde: 0, Amarillo: 0, Rojo: 0, "Sin datos": 0 }

  const functionalGlobal = {
    inclinacion: 0,
    disfrute: 0,
    confirmacion: 0,
    fruto: 0,
  }

  const spiritualGlobal = {
    sensibilidad: 0,
    fruto: 0,
    confirmacion: 0,
  }

  completeMembers.forEach((member) => {
    const evaluation = evaluations[member.id] || {}
    const functional = computeFunctionalEvaluation(evaluation)
    const spiritual = computeSpiritualEvaluation(evaluation)

    Object.entries(functional.scores).forEach(([gift, score]) => {
      functionalAgg[gift] += score
      allAgg[gift] += score
    })

    Object.entries(spiritual.scores).forEach(([gift, score]) => {
      spiritualAgg[gift] += score
      allAgg[gift] += score
    })

    reliabilities[functional.reliability] = (reliabilities[functional.reliability] || 0) + 1
    semaphores[functional.semaphore] = (semaphores[functional.semaphore] || 0) + 1

    functionalGlobal.inclinacion += functional.globalDimensions.inclinacion
    functionalGlobal.disfrute += functional.globalDimensions.disfrute
    functionalGlobal.confirmacion += functional.globalDimensions.confirmacion
    functionalGlobal.fruto += functional.globalDimensions.fruto

    spiritualGlobal.sensibilidad += spiritual.globalDimensions.sensibilidad
    spiritualGlobal.fruto += spiritual.globalDimensions.fruto
    spiritualGlobal.confirmacion += spiritual.globalDimensions.confirmacion
  })

  recognitions
    .filter((r) => group.memberIds.includes(r.to_profile_id))
    .forEach((r) => {
      ;(r.gifts || []).forEach((gift) => {
        confirmations[gift] = (confirmations[gift] || 0) + 1
      })
    })

  const divisor = completeMembers.length || 1

  return {
    members,
    completeMembers,
    functionalAgg,
    spiritualAgg,
    allAgg,
    confirmations,
    reliabilities,
    semaphores,
    top22: topNFromScores(allAgg, 22),
    topConfirmations: topNFromScores(confirmations, 22),
    functionalDimensionsAvg: {
      inclinacion: functionalGlobal.inclinacion / divisor,
      disfrute: functionalGlobal.disfrute / divisor,
      confirmacion: functionalGlobal.confirmacion / divisor,
      fruto: functionalGlobal.fruto / divisor,
    },
    spiritualDimensionsAvg: {
      sensibilidad: spiritualGlobal.sensibilidad / divisor,
      fruto: spiritualGlobal.fruto / divisor,
      confirmacion: spiritualGlobal.confirmacion / divisor,
    },
  }
}

function buildLocalAdapter(setState: (state: AppState) => void) {
  return {
    mode: "local" as const,
    async init() {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        const seed = buildEmptyState()
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
        setState(seed)
        return seed
      }
      const parsed = JSON.parse(raw) as AppState
      setState(parsed)
      return parsed
    },
    async persist(state: AppState) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      setState(state)
      return state
    },
  }
}

function buildSupabaseAdapter(url: string, anonKey: string, setState: (state: AppState) => void) {
  const supabase: SupabaseClient = createClient(url, anonKey)

  return {
    mode: "supabase" as const,
    async init() {
      const [profilesRes, evaluationsRes, groupsRes, membersRes, recognitionsRes] = await Promise.all([
        supabase.from("profiles").select("*").order("id"),
        supabase.from("evaluations").select("*"),
        supabase.from("groups").select("*").order("id"),
        supabase.from("group_members").select("group_id, profile_id"),
        supabase.from("peer_recognitions").select("*"),
      ])

      if (profilesRes.error) throw profilesRes.error
      if (evaluationsRes.error) throw evaluationsRes.error
      if (groupsRes.error) throw groupsRes.error
      if (membersRes.error) throw membersRes.error
      if (recognitionsRes.error) throw recognitionsRes.error

      const evalMap = Object.fromEntries((evaluationsRes.data || []).map((ev) => [ev.profile_id, ev])) as Record<
        number,
        Evaluation
      >

      const groups = (groupsRes.data || []).map((g) => ({
        ...g,
        memberIds: (membersRes.data || []).filter((m) => m.group_id === g.id).map((m) => m.profile_id),
      })) as Group[]

      const nextState: AppState = {
        profiles: (profilesRes.data || []) as Profile[],
        evaluations: evalMap,
        groups,
        peerRecognitions: (recognitionsRes.data || []) as PeerRecognition[],
        nextProfileId: ((profilesRes.data || []).at(-1)?.id || 0) + 1,
        nextGroupId: ((groupsRes.data || []).at(-1)?.id || 0) + 1,
      }

      setState(nextState)
      return nextState
    },
    async createProfile(profile: Omit<Profile, "id">) {
      const { data, error } = await supabase.from("profiles").insert(profile).select().single()
      if (error) throw error
      return data as Profile
    },
    async upsertEvaluation(evaluation: Evaluation) {
      const { error } = await supabase.from("evaluations").upsert(evaluation, { onConflict: "profile_id" })
      if (error) throw error
    },
    async createGroup(name: string, memberIds: number[]) {
      const { data, error } = await supabase.from("groups").insert({ name }).select().single()
      if (error) throw error

      if (memberIds.length) {
        const { error: memberError } = await supabase.from("group_members").insert(
          memberIds.map((profile_id) => ({
            group_id: data.id,
            profile_id,
          })),
        )
        if (memberError) throw memberError
      }

      return { ...(data as Group), memberIds }
    },
    async replaceRecognition(payload: Omit<PeerRecognition, "id">) {
      const del = await supabase
        .from("peer_recognitions")
        .delete()
        .eq("from_profile_id", payload.from_profile_id)
        .eq("to_profile_id", payload.to_profile_id)

      if (del.error) throw del.error

      const { error } = await supabase.from("peer_recognitions").insert(payload)
      if (error) throw error
    },
  }
}

function ScoreSelect({
  value,
  onChange,
}: {
  value: number | ""
  onChange: (value: number | "") => void
}) {
  return (
    <Select value={value === "" ? "blank" : String(value)} onValueChange={(v) => onChange(v === "blank" ? "" : Number(v))}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder="-" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="blank">-</SelectItem>
        <SelectItem value="1">1</SelectItem>
        <SelectItem value="2">2</SelectItem>
        <SelectItem value="3">3</SelectItem>
        <SelectItem value="4">4</SelectItem>
        <SelectItem value="5">5</SelectItem>
      </SelectContent>
    </Select>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border bg-white p-3 text-center">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-slate-100 p-2">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button className="w-full" onClick={onClick}>
          Abrir
        </Button>
      </CardContent>
    </Card>
  )
}

function GiftTable({
  title,
  entries,
  max,
}: {
  title: string
  entries: [string, number][]
  max: number
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.length ? (
          entries.map(([gift, score]) => (
            <div key={gift} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{gift}</span>
                <span className="font-medium">
                  {score} · {getScoreLabel(score, max)}
                </span>
              </div>
              <Progress value={max ? (score / max) * 100 : 0} />
            </div>
          ))
        ) : (
          <div className="text-sm text-slate-500">Sin datos</div>
        )}
      </CardContent>
    </Card>
  )
}

function TopCard({
  title,
  items,
}: {
  title: string
  items: { name: string; score: number }[]
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length ? (
          items.map((item, idx) => (
            <div key={`${item.name}-${idx}`} className="flex items-center justify-between rounded-xl border p-3 text-sm">
              <span>{item.name}</span>
              <Badge variant="secondary">{item.score}</Badge>
            </div>
          ))
        ) : (
          <div className="text-sm text-slate-500">Sin datos</div>
        )}
      </CardContent>
    </Card>
  )
}

export default function Page() {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

  const [state, setState] = useState<AppState>(buildEmptyState())
  const [adapter, setAdapter] = useState<ReturnType<typeof buildLocalAdapter> | ReturnType<typeof buildSupabaseAdapter> | null>(null)

  const [activeTab, setActiveTab] = useState("inicio")
  const [selectedProfileId, setSelectedProfileId] = useState("")
  const [selectedGroupId, setSelectedGroupId] = useState("")
  const [search, setSearch] = useState("")

  const [supabaseUrl, setSupabaseUrl] = useState(envUrl)
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(envKey)
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    connected: false,
    mode: "local",
    message: "Inicializando conexión...",
  })

  const [userForm, setUserForm] = useState({
    full_name: "",
    age: "",
    sex: "",
    church: "",
    service_areas: "",
  })

  const [groupName, setGroupName] = useState("")
  const [groupMembers, setGroupMembers] = useState<number[]>([])

  const [fromProfileId, setFromProfileId] = useState("")
  const [toProfileId, setToProfileId] = useState("")
  const [selectedRecognitionGifts, setSelectedRecognitionGifts] = useState<string[]>([])

  useEffect(() => {
    let mounted = true

    async function initApp() {
      if (envUrl && envKey) {
        try {
          const remoteAdapter = buildSupabaseAdapter(envUrl, envKey, (next) => {
            if (mounted) setState(next)
          })
          await remoteAdapter.init()
          if (!mounted) return
          setAdapter(remoteAdapter)
          setConnectionState({
            connected: true,
            mode: "supabase",
            message: "Conectado a Supabase. Multiusuario y persistencia activados.",
          })
          return
        } catch (error) {
          console.error("Fallo conexión automática a Supabase:", error)
        }
      }

      const localAdapter = buildLocalAdapter((next) => {
        if (mounted) setState(next)
      })
      await localAdapter.init()
      if (!mounted) return
      setAdapter(localAdapter)
      setConnectionState({
        connected: true,
        mode: "local",
        message: "Modo local activo",
      })
    }

    initApp()
    return () => {
      mounted = false
    }
  }, [envUrl, envKey])

  const profiles = useMemo(() => [...state.profiles].sort((a, b) => a.id - b.id), [state.profiles])
  const selectedProfile = profiles.find((p) => String(p.id) === String(selectedProfileId)) || null
  const selectedGroup = state.groups.find((g) => String(g.id) === String(selectedGroupId)) || null

  const selectedEvaluation =
    selectedProfile
      ? state.evaluations[selectedProfile.id] || {
          profile_id: selectedProfile.id,
          functional_answers: blankFunctionalAnswers(),
          spiritual_answers: blankSpiritualAnswers(),
        }
      : null

  const functionalReport = selectedEvaluation ? computeFunctionalEvaluation(selectedEvaluation) : null
  const spiritualReport = selectedEvaluation ? computeSpiritualEvaluation(selectedEvaluation) : null
  const peerSummary = selectedProfile ? recognitionSummaryForUser(selectedProfile.id, state.peerRecognitions) : null
  const groupReport = selectedGroup ? buildGroupReport(selectedGroup, state.profiles, state.evaluations, state.peerRecognitions) : null

  const filteredProfiles = profiles.filter((p) =>
    `${p.full_name} ${p.church || ""} ${p.service_areas || ""}`.toLowerCase().includes(search.toLowerCase()),
  )

  const summary = {
    profiles: profiles.length,
    groups: state.groups.length,
    completed: profiles.filter((p) => {
      const ev = state.evaluations[p.id] || {}
      return computeFunctionalEvaluation(ev).answered === 48 && computeSpiritualEvaluation(ev).answered === 30
    }).length,
    recognitions: state.peerRecognitions.length,
  }

  async function switchToLocal() {
    const localAdapter = buildLocalAdapter(setState)
    setAdapter(localAdapter)
    await localAdapter.init()
    setConnectionState({
      connected: true,
      mode: "local",
      message: "Modo local activo",
    })
  }

  async function connectSupabase() {
    try {
      if (!supabaseUrl || !supabaseAnonKey) {
        setConnectionState({
          connected: false,
          mode: "supabase",
          message: "Falta la URL o la anon key de Supabase.",
        })
        return
      }

      const remoteAdapter = buildSupabaseAdapter(supabaseUrl, supabaseAnonKey, setState)
      await remoteAdapter.init()
      setAdapter(remoteAdapter)
      setConnectionState({
        connected: true,
        mode: "supabase",
        message: "Conectado a Supabase. Multiusuario y persistencia activados.",
      })
    } catch (error) {
      setConnectionState({
        connected: false,
        mode: "supabase",
        message: `No se pudo conectar: ${error instanceof Error ? error.message : "Error desconocido"}`,
      })
    }
  }

  async function persistLocal(nextState: AppState) {
    if (adapter?.mode === "local") {
      await adapter.persist(nextState)
      return
    }
    setState(nextState)
  }

  async function createProfile() {
    if (!userForm.full_name.trim()) return

    if (adapter?.mode === "supabase") {
      const created = await adapter.createProfile({
        full_name: userForm.full_name.trim(),
        age: userForm.age ? Number(userForm.age) : null,
        sex: userForm.sex || null,
        church: userForm.church || null,
        service_areas: userForm.service_areas || null,
      })

      const nextState = {
        ...state,
        profiles: [...state.profiles, created],
        evaluations: {
          ...state.evaluations,
          [created.id]: {
            profile_id: created.id,
            functional_answers: blankFunctionalAnswers(),
            spiritual_answers: blankSpiritualAnswers(),
          },
        },
      }
      setState(nextState)
      setSelectedProfileId(String(created.id))
    } else {
      const created: Profile = {
        id: state.nextProfileId,
        full_name: userForm.full_name.trim(),
        age: userForm.age ? Number(userForm.age) : null,
        sex: userForm.sex || null,
        church: userForm.church || null,
        service_areas: userForm.service_areas || null,
        created_at: new Date().toISOString(),
      }

      await persistLocal({
        ...state,
        nextProfileId: state.nextProfileId + 1,
        profiles: [...state.profiles, created],
        evaluations: {
          ...state.evaluations,
          [created.id]: {
            profile_id: created.id,
            functional_answers: blankFunctionalAnswers(),
            spiritual_answers: blankSpiritualAnswers(),
          },
        },
      })

      setSelectedProfileId(String(created.id))
    }

    setUserForm({
      full_name: "",
      age: "",
      sex: "",
      church: "",
      service_areas: "",
    })
    setActiveTab("evaluar")
  }

  async function updateEvaluation(
    profileId: number,
    key: "functional_answers" | "spiritual_answers",
    questionId: string,
    value: number | "",
  ) {
    const current =
      state.evaluations[profileId] || {
        profile_id: profileId,
        functional_answers: blankFunctionalAnswers(),
        spiritual_answers: blankSpiritualAnswers(),
      }

    const nextEval: Evaluation = {
      ...current,
      [key]: {
        ...current[key],
        [questionId]: value,
      },
      completed_functional:
        key === "functional_answers"
          ? FUNCTIONAL_QUESTIONS.every((q) => (q.id === questionId ? value !== "" : current.functional_answers[q.id] !== ""))
          : current.completed_functional,
      completed_spiritual:
        key === "spiritual_answers"
          ? SPIRITUAL_QUESTIONS.every((q) => (q.id === questionId ? value !== "" : current.spiritual_answers[q.id] !== ""))
          : current.completed_spiritual,
      updated_at: new Date().toISOString(),
    }

    const nextState = {
      ...state,
      evaluations: {
        ...state.evaluations,
        [profileId]: nextEval,
      },
    }

    setState(nextState)

    if (adapter?.mode === "supabase") {
      await adapter.upsertEvaluation(nextEval)
    } else {
      await persistLocal(nextState)
    }
  }

  async function createGroup() {
    if (!groupName.trim()) return
    const memberIds = [...new Set(groupMembers)].slice(0, 300)

    if (adapter?.mode === "supabase") {
      const created = await adapter.createGroup(groupName.trim(), memberIds)
      setState({
        ...state,
        groups: [...state.groups, created],
      })
      setSelectedGroupId(String(created.id))
    } else {
      const created: Group = {
        id: state.nextGroupId,
        name: groupName.trim(),
        memberIds,
        created_at: new Date().toISOString(),
      }

      await persistLocal({
        ...state,
        nextGroupId: state.nextGroupId + 1,
        groups: [...state.groups, created],
      })
      setSelectedGroupId(String(created.id))
    }

    setGroupName("")
    setGroupMembers([])
  }

  async function saveRecognition() {
    if (!fromProfileId || !toProfileId || !selectedRecognitionGifts.length) return

    const payload = {
      from_profile_id: Number(fromProfileId),
      to_profile_id: Number(toProfileId),
      gifts: selectedRecognitionGifts,
      created_at: new Date().toISOString(),
    }

    const nextRecognitions = [
      ...state.peerRecognitions.filter(
        (r) =>
          !(
            Number(r.from_profile_id) === Number(payload.from_profile_id) &&
            Number(r.to_profile_id) === Number(payload.to_profile_id)
          ),
      ),
      {
        id: `${payload.from_profile_id}-${payload.to_profile_id}-${Date.now()}`,
        ...payload,
      },
    ]

    const nextState = {
      ...state,
      peerRecognitions: nextRecognitions,
    }

    setState(nextState)

    if (adapter?.mode === "supabase") {
      await adapter.replaceRecognition(payload)
    } else {
      await persistLocal(nextState)
    }

    setSelectedRecognitionGifts([])
  }

  return (
    <div className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardContent className="p-5 md:p-7">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="text-sm font-medium text-slate-500">Plataforma Dones Amistad Irapuato · Lógica tipo Excel</div>
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                  Sistema multiusuario de dones funcionales y espirituales
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Compatible con celular y PC. Integra autodiagnóstico, confirmación por terceros, reportes y base de datos.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <Metric label="Usuarios" value={summary.profiles} />
                <Metric label="Grupos" value={summary.groups} />
                <Metric label="Completos" value={summary.completed} />
                <Metric label="Confirmaciones" value={summary.recognitions} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Conectividad y persistencia</CardTitle>
                <CardDescription>
                  Modo local para pruebas o Supabase para operación multiusuario real y almacenamiento futuro.
                </CardDescription>
              </div>
              <Badge variant={connectionState.connected ? "default" : "secondary"} className="w-fit">
                {connectionState.mode === "supabase" ? "Supabase" : "Local"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription>{connectionState.message}</AlertDescription>
            </Alert>

            <div className="rounded-xl border p-3 text-sm">
              ENV URL: {envUrl ? "sí" : "no"} | ENV KEY: {envKey ? "sí" : "no"}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2 md:col-span-1">
                <Label>Supabase URL</Label>
                <Input value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} placeholder="https://xxxx.supabase.co" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Supabase anon key</Label>
                <Input value={supabaseAnonKey} onChange={(e) => setSupabaseAnonKey(e.target.value)} placeholder="eyJ..." />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={connectSupabase}>
                <Cloud className="mr-2 h-4 w-4" />
                Conectar Supabase
              </Button>
              <Button variant="secondary" onClick={switchToLocal}>
                Usar modo local
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Ver esquema SQL
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Esquema SQL para Supabase</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-[70vh] rounded-xl border bg-slate-50 p-4">
                    <pre className="whitespace-pre-wrap text-xs">{SQL_SCHEMA}</pre>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <ScrollArea className="w-full whitespace-nowrap rounded-2xl border bg-white">
            <TabsList className="inline-flex h-auto w-max min-w-full justify-start rounded-2xl bg-white p-2">
              <TabsTrigger value="inicio">Inicio</TabsTrigger>
              <TabsTrigger value="usuarios">Crear usuario</TabsTrigger>
              <TabsTrigger value="evaluar">Evaluar usuario</TabsTrigger>
              <TabsTrigger value="grupos">Crear grupos</TabsTrigger>
              <TabsTrigger value="confirmar">Dones que veo en...</TabsTrigger>
              <TabsTrigger value="reportes">Reportes</TabsTrigger>
            </TabsList>
          </ScrollArea>

          <TabsContent value="inicio" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FeatureCard icon={UserPlus} title="Crear usuario" description="Alta con ID automático y datos básicos." onClick={() => setActiveTab("usuarios")} />
              <FeatureCard icon={ClipboardCheck} title="Evaluar" description="48 funcionales y 30 espirituales con lógica tipo Excel." onClick={() => setActiveTab("evaluar")} />
              <FeatureCard icon={Layers3} title="Grupos" description="Arma grupos de hasta 300 personas." onClick={() => setActiveTab("grupos")} />
              <FeatureCard icon={BarChart3} title="Reportes" description="Persona, grupo, top 22 y confirmaciones." onClick={() => setActiveTab("reportes")} />
            </div>

            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>Usuarios registrados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar persona..." />
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filteredProfiles.map((profile) => {
                    const evaluation = state.evaluations[profile.id] || {}
                    const functional = computeFunctionalEvaluation(evaluation)
                    const spiritual = computeSpiritualEvaluation(evaluation)
                    const seen = recognitionSummaryForUser(profile.id, state.peerRecognitions)

                    return (
                      <Card key={profile.id} className="rounded-2xl">
                        <CardContent className="space-y-2 p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="font-semibold">{profile.full_name}</div>
                              <div className="text-sm text-slate-500">ID {profile.id} · {profile.church || "-"}</div>
                            </div>
                            <Badge variant="secondary">
                              {functional.answered === 48 && spiritual.answered === 30 ? "Completo" : "Pendiente"}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <div className="text-slate-500">Funcional</div>
                              <div>{functional.top3[0]?.name || "-"}</div>
                            </div>
                            <div>
                              <div className="text-slate-500">Espiritual</div>
                              <div>{spiritual.top3[0]?.name || "-"}</div>
                            </div>
                            <div>
                              <div className="text-slate-500">Otros ven</div>
                              <div>{seen.top[0]?.name || "-"}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usuarios">
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>Crear usuario</CardTitle>
                <CardDescription>El sistema asigna ID automático y conserva la información para consultas futuras.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nombre completo</Label>
                  <Input value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Edad</Label>
                  <Input type="number" value={userForm.age} onChange={(e) => setUserForm({ ...userForm, age: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Sexo</Label>
                  <Select value={userForm.sex} onValueChange={(value) => setUserForm({ ...userForm, sex: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Femenino">Femenino</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Iglesia</Label>
                  <Input value={userForm.church} onChange={(e) => setUserForm({ ...userForm, church: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Área o áreas de servicio</Label>
                  <Textarea value={userForm.service_areas} onChange={(e) => setUserForm({ ...userForm, service_areas: e.target.value })} />
                </div>
                <div className="flex justify-end md:col-span-2">
                  <Button onClick={createProfile}>Crear usuario</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evaluar" className="space-y-4">
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>Evaluar usuario</CardTitle>
                <CardDescription>
                  La capa funcional usa 48 reactivos concretos: 4 preguntas por cada uno de los 12 dones funcionales.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Usuario</Label>
                  <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={String(profile.id)}>
                          {profile.id} · {profile.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProfile && selectedEvaluation && functionalReport && spiritualReport ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 xl:grid-cols-2">
                      <Card className="rounded-2xl">
                        <CardHeader>
                          <CardTitle className="text-base">Resumen funcional</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            <Metric label="Contestadas" value={`${functionalReport.answered}/48`} />
                            <Metric label="Confiabilidad" value={functionalReport.reliability} />
                            <Metric label="Semáforo" value={functionalReport.semaphore} />
                            <Metric label="Madurez" value={`${Math.round(functionalReport.maturityPct * 100)}%`} />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="rounded-2xl">
                        <CardHeader>
                          <CardTitle className="text-base">Resumen espiritual</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            <Metric label="Contestadas" value={`${spiritualReport.answered}/30`} />
                            <Metric label="Confiabilidad" value={spiritualReport.reliability} />
                            <Metric label="Semáforo" value={spiritualReport.semaphore} />
                            <Metric label="Madurez" value={`${Math.round(spiritualReport.maturityPct * 100)}%`} />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="rounded-2xl">
                      <CardHeader>
                        <CardTitle className="text-base">Capa funcional · 48 preguntas</CardTitle>
                        <CardDescription>
                          Cada don funcional tiene 4 preguntas: inclinación, disfrute, confirmación y fruto.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[560px] pr-3">
                          <div className="space-y-4">
                            {FUNCTIONAL_GIFTS.map((gift) => {
                              const giftQuestions = FUNCTIONAL_QUESTIONS.filter((q) => q.gift === gift)
                              return (
                                <div key={gift} className="rounded-2xl border p-4">
                                  <div className="mb-3 flex items-center justify-between gap-3">
                                    <div className="font-semibold">{gift}</div>
                                    <Badge variant="secondary">
                                      Total {functionalReport.scores[gift]}
                                    </Badge>
                                  </div>
                                  <div className="space-y-3">
                                    {giftQuestions.map((question, index) => (
                                      <div key={question.id} className="grid grid-cols-[1fr_92px] gap-3 rounded-2xl border p-3">
                                        <div>
                                          <div className="mb-1 flex flex-wrap items-center gap-2">
                                            <span className="text-xs text-slate-500">
                                              {index + 1}. {FUNCTIONAL_DIMENSION_LABELS[question.dimension]}
                                            </span>
                                            <Badge variant="outline">{FUNCTIONAL_DIMENSION_LABELS[question.dimension]}</Badge>
                                          </div>
                                          <div className="text-sm">{question.text}</div>
                                        </div>
                                        <ScoreSelect
                                          value={selectedEvaluation.functional_answers[question.id] ?? ""}
                                          onChange={(value) => updateEvaluation(selectedProfile.id, "functional_answers", question.id, value)}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                      <CardHeader>
                        <CardTitle className="text-base">Capa espiritual · 30 preguntas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[560px] pr-3">
                          <div className="space-y-4">
                            {SPIRITUAL_GIFTS.map((gift) => {
                              const giftQuestions = SPIRITUAL_QUESTIONS.filter((q) => q.gift === gift)
                              return (
                                <div key={gift} className="rounded-2xl border p-4">
                                  <div className="mb-3 flex items-center justify-between gap-3">
                                    <div className="font-semibold">{gift}</div>
                                    <Badge variant="secondary">
                                      Total {spiritualReport.scores[gift]}
                                    </Badge>
                                  </div>
                                  <div className="space-y-3">
                                    {giftQuestions.map((question, index) => (
                                      <div key={question.id} className="grid grid-cols-[1fr_92px] gap-3 rounded-2xl border p-3">
                                        <div>
                                          <div className="mb-1 flex flex-wrap items-center gap-2">
                                            <span className="text-xs text-slate-500">
                                              {index + 1}. {SPIRITUAL_DIMENSION_LABELS[question.dimension]}
                                            </span>
                                            <Badge variant="outline">{SPIRITUAL_DIMENSION_LABELS[question.dimension]}</Badge>
                                          </div>
                                          <div className="text-sm">{question.text}</div>
                                        </div>
                                        <ScoreSelect
                                          value={selectedEvaluation.spiritual_answers[question.id] ?? ""}
                                          onChange={(value) => updateEvaluation(selectedProfile.id, "spiritual_answers", question.id, value)}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">Selecciona una persona para capturar su evaluación.</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grupos" className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
              <Card className="rounded-3xl">
                <CardHeader>
                  <CardTitle>Crear grupo</CardTitle>
                  <CardDescription>Un usuario puede pertenecer a varios grupos. Máximo 300 integrantes por grupo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nombre del grupo</Label>
                    <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Miembros</Label>
                    <ScrollArea className="h-72 rounded-2xl border p-3">
                      <div className="space-y-3">
                        {profiles.map((profile) => (
                          <label key={profile.id} className="flex items-start gap-3">
                            <Checkbox
                              checked={groupMembers.includes(profile.id)}
                              onCheckedChange={(checked) => {
                                const isChecked = Boolean(checked)
                                setGroupMembers((prev) =>
                                  isChecked ? [...new Set([...prev, profile.id])].slice(0, 300) : prev.filter((x) => x !== profile.id),
                                )
                              }}
                            />
                            <span className="text-sm">
                              {profile.id} · {profile.full_name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <Button className="w-full" onClick={createGroup}>
                    Crear grupo
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-3xl">
                <CardHeader>
                  <CardTitle>Grupos creados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {state.groups.map((group) => (
                    <div key={group.id} className="flex items-center justify-between rounded-2xl border p-4">
                      <div>
                        <div className="font-semibold">{group.name}</div>
                        <div className="text-sm text-slate-500">{group.memberIds.length} miembros</div>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSelectedGroupId(String(group.id))
                          setActiveTab("reportes")
                        }}
                      >
                        Ver reporte
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="confirmar" className="space-y-4">
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>Dones que veo en...</CardTitle>
                <CardDescription>Cada usuario puede identificar dones que percibe en otras personas del sistema.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Quién confirma</Label>
                  <Select value={fromProfileId} onValueChange={setFromProfileId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={String(profile.id)}>
                          {profile.id} · {profile.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Persona observada</Label>
                  <Select value={toProfileId} onValueChange={setToProfileId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles
                        .filter((profile) => String(profile.id) !== fromProfileId)
                        .map((profile) => (
                          <SelectItem key={profile.id} value={String(profile.id)}>
                            {profile.id} · {profile.full_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Dones que veo en esta persona</Label>
                  <ScrollArea className="h-72 rounded-2xl border p-3">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {ALL_GIFTS.map((gift) => (
                        <label key={gift} className="flex items-start gap-3 rounded-2xl border p-3 text-sm">
                          <Checkbox
                            checked={selectedRecognitionGifts.includes(gift)}
                            onCheckedChange={(checked) => {
                              const isChecked = Boolean(checked)
                              setSelectedRecognitionGifts((prev) => (isChecked ? [...prev, gift] : prev.filter((g) => g !== gift)))
                            }}
                          />
                          <span>{gift}</span>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="flex justify-end md:col-span-2">
                  <Button onClick={saveRecognition}>Guardar confirmación</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reportes" className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
              <Card className="rounded-3xl">
                <CardHeader>
                  <CardTitle>Selector de reportes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Persona</Label>
                    <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar persona" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.id} value={String(profile.id)}>
                            {profile.id} · {profile.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Grupo</Label>
                    <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar grupo" />
                      </SelectTrigger>
                      <SelectContent>
                        {state.groups.map((group) => (
                          <SelectItem key={group.id} value={String(group.id)}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {selectedProfile && functionalReport && spiritualReport && peerSummary ? (
                  <Card className="rounded-3xl">
                    <CardHeader>
                      <CardTitle>Reporte individual · {selectedProfile.full_name}</CardTitle>
                      <CardDescription>
                        ID {selectedProfile.id} · {selectedProfile.church || "-"} · {selectedProfile.service_areas || "-"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid gap-3 md:grid-cols-4">
                        <Metric label="Confiabilidad" value={functionalReport.reliability} />
                        <Metric label="Semáforo" value={functionalReport.semaphore} />
                        <Metric label="Funcional" value={`${Math.round(functionalReport.completionPct * 100)}%`} />
                        <Metric label="Espiritual" value={`${Math.round(spiritualReport.completionPct * 100)}%`} />
                      </div>

                      <div className="grid gap-4 xl:grid-cols-3">
                        <TopCard title="Top funcional" items={functionalReport.top3} />
                        <TopCard title="Top espiritual" items={spiritualReport.top3} />
                        <TopCard title="Los dones que otros ven en mí" items={peerSummary.top.slice(0, 10)} />
                      </div>

                      <div className="grid gap-4 xl:grid-cols-2">
                        <GiftTable
                          title="Clasificación funcional"
                          entries={Object.entries(functionalReport.scores).sort((a, b) => b[1] - a[1])}
                          max={20}
                        />
                        <GiftTable
                          title="Clasificación espiritual"
                          entries={Object.entries(spiritualReport.scores).sort((a, b) => b[1] - a[1])}
                          max={15}
                        />
                      </div>

                      <Card className="rounded-2xl border-dashed">
                        <CardHeader>
                          <CardTitle className="text-base">Rubros globales funcionales</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <Metric label="Inclinación" value={`${Math.round(functionalReport.globalDimensions.inclinacion * 100)}%`} />
                          <Metric label="Disfrute" value={`${Math.round(functionalReport.globalDimensions.disfrute * 100)}%`} />
                          <Metric label="Confirmación" value={`${Math.round(functionalReport.globalDimensions.confirmacion * 100)}%`} />
                          <Metric label="Fruto" value={`${Math.round(functionalReport.globalDimensions.fruto * 100)}%`} />
                        </CardContent>
                      </Card>

                      <Card className="rounded-2xl border-dashed">
                        <CardHeader>
                          <CardTitle className="text-base">Rubros globales espirituales</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3 md:grid-cols-3">
                          <Metric label="Sensibilidad" value={`${Math.round(spiritualReport.globalDimensions.sensibilidad * 100)}%`} />
                          <Metric label="Fruto" value={`${Math.round(spiritualReport.globalDimensions.fruto * 100)}%`} />
                          <Metric label="Confirmación" value={`${Math.round(spiritualReport.globalDimensions.confirmacion * 100)}%`} />
                        </CardContent>
                      </Card>
                    </CardContent>
                  </Card>
                ) : null}

                {selectedGroup && groupReport ? (
                  <Card className="rounded-3xl">
                    <CardHeader>
                      <CardTitle>Reporte grupal · {selectedGroup.name}</CardTitle>
                      <CardDescription>
                        {groupReport.members.length} miembros · {groupReport.completeMembers.length} completos
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-6">
                        <Metric label="Miembros" value={groupReport.members.length} />
                        <Metric label="Completos" value={groupReport.completeMembers.length} />
                        <Metric label="Verde" value={groupReport.semaphores.Verde || 0} />
                        <Metric label="Alta" value={groupReport.reliabilities.Alta || 0} />
                        <Metric label="Amarillo" value={groupReport.semaphores.Amarillo || 0} />
                        <Metric label="Rojo" value={groupReport.semaphores.Rojo || 0} />
                      </div>

                      <div className="grid gap-4 xl:grid-cols-3">
                        <GiftTable
                          title="Top funcional del grupo"
                          entries={Object.entries(groupReport.functionalAgg).sort((a, b) => b[1] - a[1]).slice(0, 12)}
                          max={Math.max(...Object.values(groupReport.functionalAgg), 1)}
                        />
                        <GiftTable
                          title="Top espiritual del grupo"
                          entries={Object.entries(groupReport.spiritualAgg).sort((a, b) => b[1] - a[1]).slice(0, 10)}
                          max={Math.max(...Object.values(groupReport.spiritualAgg), 1)}
                        />
                        <GiftTable
                          title="Top 22 del grupo"
                          entries={groupReport.top22.map((x) => [x.name, x.score])}
                          max={groupReport.top22[0]?.score || 1}
                        />
                      </div>

                      <div className="grid gap-4 xl:grid-cols-2">
                        <GiftTable
                          title="Dones más confirmados por terceros"
                          entries={groupReport.topConfirmations.map((x) => [x.name, x.score])}
                          max={groupReport.topConfirmations[0]?.score || 1}
                        />
                        <Card className="rounded-2xl">
                          <CardHeader>
                            <CardTitle className="text-base">Promedios funcionales del grupo</CardTitle>
                          </CardHeader>
                          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <Metric label="Inclinación" value={`${Math.round(groupReport.functionalDimensionsAvg.inclinacion * 100)}%`} />
                            <Metric label="Disfrute" value={`${Math.round(groupReport.functionalDimensionsAvg.disfrute * 100)}%`} />
                            <Metric label="Confirmación" value={`${Math.round(groupReport.functionalDimensionsAvg.confirmacion * 100)}%`} />
                            <Metric label="Fruto" value={`${Math.round(groupReport.functionalDimensionsAvg.fruto * 100)}%`} />
                          </CardContent>
                        </Card>
                      </div>

                      <Card className="rounded-2xl">
                        <CardHeader>
                          <CardTitle className="text-base">Promedios espirituales del grupo</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3 md:grid-cols-3">
                          <Metric label="Sensibilidad" value={`${Math.round(groupReport.spiritualDimensionsAvg.sensibilidad * 100)}%`} />
                          <Metric label="Fruto" value={`${Math.round(groupReport.spiritualDimensionsAvg.fruto * 100)}%`} />
                          <Metric label="Confirmación" value={`${Math.round(groupReport.spiritualDimensionsAvg.confirmacion * 100)}%`} />
                        </CardContent>
                      </Card>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}