"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import jsPDF from "jspdf"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ArrowLeft,
  BarChart3,
  ClipboardCheck,
  Download,
  Pencil,
  Save,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react"

type FunctionalDimension = "inclinacion" | "disfrute" | "confirmacion" | "fruto"
type SpiritualDimension = "sensibilidad" | "fruto" | "confirmacion"
type ReportMode = "persona" | "grupo" | "don"

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

const STORAGE_KEY = "plataforma-dones-amistad-irapuato-v11"

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
    { text: "Cuando una persona no entiende una verdad bíblica o un tema importante, siento carga por explicarlo de forma clara y ordenada.", dimension: "inclinacion" },
    { text: "Disfruto estudiar, estructurar y transmitir conocimiento para que otros comprendan mejor un tema.", dimension: "disfrute" },
    { text: "Con frecuencia otras personas me buscan para que les aclare dudas o les ayude a entender algo paso a paso.", dimension: "confirmacion" },
    { text: "Si debo preparar una explicación o clase, normalmente encuentro facilidad para organizar ideas y comunicar con sentido.", dimension: "fruto" },
  ],
  Liderazgo: [
    { text: "Cuando un grupo está desorganizado o sin dirección, naturalmente empiezo a ordenar, orientar y mover a las personas hacia una meta.", dimension: "inclinacion" },
    { text: "Me siento cómodo tomando responsabilidad para coordinar personas, tiempos o tareas cuando hace falta avanzar.", dimension: "disfrute" },
    { text: "Otras personas suelen seguir mis indicaciones o buscar mi dirección cuando hay que tomar decisiones o definir rumbo.", dimension: "confirmacion" },
    { text: "Disfruto ver cómo un equipo crece, se ordena y cumple objetivos cuando hay una conducción clara.", dimension: "fruto" },
  ],
  Servicio: [
    { text: "Cuando veo una necesidad práctica, mi impulso es ayudar de inmediato aunque nadie me lo pida.", dimension: "inclinacion" },
    { text: "Me siento realizado cuando apoyo tareas concretas que facilitan el trabajo o el bienestar de otros.", dimension: "disfrute" },
    { text: "Con frecuencia participo resolviendo asuntos prácticos, operativos o logísticos sin buscar protagonismo.", dimension: "confirmacion" },
    { text: "Las personas suelen reconocer en mí disposición constante para ayudar, colaborar y atender necesidades reales.", dimension: "fruto" },
  ],
  Misericordia: [
    { text: "Cuando veo a alguien herido, vulnerable o en sufrimiento, siento una carga profunda por acompañarlo y aliviar su dolor.", dimension: "inclinacion" },
    { text: "Me resulta natural acercarme con compasión, paciencia y sensibilidad a personas que están pasando por momentos difíciles.", dimension: "disfrute" },
    { text: "Otros suelen percibir en mí empatía genuina y capacidad para consolar sin juzgar duramente.", dimension: "confirmacion" },
    { text: "Disfruto restaurar, cuidar y sostener emocional o espiritualmente a personas que necesitan apoyo.", dimension: "fruto" },
  ],
  Exhortación: [
    { text: "Cuando alguien está estancado, desanimado o desviado, siento impulso por animarlo, corregirlo y ayudarlo a avanzar.", dimension: "inclinacion" },
    { text: "Me es natural hablar con claridad para motivar, fortalecer o llamar a una persona a responder correctamente.", dimension: "disfrute" },
    { text: "Con frecuencia mis palabras ayudan a otros a reaccionar, tomar decisiones o perseverar en medio de la dificultad.", dimension: "confirmacion" },
    { text: "Disfruto acompañar procesos de crecimiento personal o espiritual ayudando a otros a dar el siguiente paso.", dimension: "fruto" },
  ],
  Evangelismo: [
    { text: "Siento carga por compartir el mensaje de salvación con personas que aún no conocen a Cristo.", dimension: "inclinacion" },
    { text: "Me resulta natural iniciar conversaciones espirituales o presentar el evangelio de forma sencilla y directa.", dimension: "disfrute" },
    { text: "Con frecuencia identifico oportunidades para hablar de Jesús y animar a otros a responder a la fe.", dimension: "confirmacion" },
    { text: "Disfruto ver a personas acercarse a Dios, interesarse por el evangelio o tomar decisiones espirituales.", dimension: "fruto" },
  ],
  Fe: [
    { text: "Cuando otros dudan o ven imposible una situación, dentro de mí suele permanecer una confianza firme en que Dios puede actuar.", dimension: "inclinacion" },
    { text: "Me resulta natural sostener esperanza, orar con convicción y permanecer firme aun cuando no hay evidencias visibles.", dimension: "disfrute" },
    { text: "Otras personas encuentran ánimo o estabilidad en mi manera de confiar en Dios en medio de procesos difíciles.", dimension: "confirmacion" },
    { text: "Disfruto asumir retos espirituales o ministeriales confiando en la provisión y respaldo de Dios.", dimension: "fruto" },
  ],
  Discernimiento: [
    { text: "Con frecuencia percibo diferencias entre lo auténtico y lo engañoso en personas, ambientes, mensajes o decisiones.", dimension: "inclinacion" },
    { text: "Cuando algo no está bien, suelo identificarlo internamente aun antes de tener toda la información visible.", dimension: "disfrute" },
    { text: "Otras personas buscan mi opinión para evaluar si una situación, propuesta o influencia es sana o no.", dimension: "confirmacion" },
    { text: "Disfruto ayudar a filtrar, evaluar y distinguir con sabiduría lo que conviene de lo que debe evitarse.", dimension: "fruto" },
  ],
  Profecía: [
    { text: "Siento carga por expresar con verdad y valentía lo que Dios demanda o lo que una situación necesita escuchar.", dimension: "inclinacion" },
    { text: "Me resulta natural confrontar lo incorrecto, señalar desvíos o llamar a una respuesta alineada con la voluntad de Dios.", dimension: "disfrute" },
    { text: "Con frecuencia mis palabras producen conciencia, convicción o claridad espiritual en otros.", dimension: "confirmacion" },
    { text: "Disfruto comunicar mensajes directos, pertinentes y espiritualmente incisivos cuando es necesario.", dimension: "fruto" },
  ],
  Generosidad: [
    { text: "Cuando detecto una necesidad, me nace compartir recursos, tiempo o bienes para suplirla con alegría.", dimension: "inclinacion" },
    { text: "Me resulta natural dar sin sentir que pierdo, especialmente cuando percibo que eso bendice o impulsa a otros.", dimension: "disfrute" },
    { text: "Otras personas suelen reconocer en mí disposición abierta para contribuir materialmente o sostener causas valiosas.", dimension: "confirmacion" },
    { text: "Disfruto sembrar recursos en personas, proyectos o necesidades con sentido de propósito y gratitud.", dimension: "fruto" },
  ],
  Pastoreo: [
    { text: "Siento carga por cuidar, acompañar y dar seguimiento continuo al crecimiento de personas o grupos.", dimension: "inclinacion" },
    { text: "Me resulta natural interesarme por el estado espiritual, emocional y práctico de otros de forma constante.", dimension: "disfrute" },
    { text: "Con frecuencia las personas me buscan para consejo, cuidado, acompañamiento o dirección cercana.", dimension: "confirmacion" },
    { text: "Disfruto ver procesos de madurez, protección y restauración sostenidos en personas que acompaño.", dimension: "fruto" },
  ],
  Sabiduría: [
    { text: "Cuando surgen problemas complejos, suelo ver conexiones, caminos de solución y aplicaciones prácticas que otros no perciben fácilmente.", dimension: "inclinacion" },
    { text: "Me resulta natural traducir principios espirituales o conocimientos en decisiones útiles, prudentes y oportunas.", dimension: "disfrute" },
    { text: "Otras personas buscan mi consejo cuando necesitan claridad para decidir correctamente en situaciones difíciles.", dimension: "confirmacion" },
    { text: "Disfruto aportar perspectiva, criterio y dirección práctica que ayude a resolver asuntos con equilibrio y madurez.", dimension: "fruto" },
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

function topNFromScores(scoreMap: Record<string, number>, n = 3) {
  return Object.entries(scoreMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, score]) => ({ name, score }))
}

function average(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
}

function getReliability(answered: number, total: number) {
  const pct = total ? answered / total : 0
  if (pct >= 1) return "Alta"
  if (pct >= 0.75) return "Media"
  if (pct > 0) return "Baja"
  return "Sin datos"
}

function getSemaphore(pct: number) {
  if (pct >= 0.8) return "Verde"
  if (pct >= 0.6) return "Amarillo"
  if (pct > 0) return "Rojo"
  return "Sin datos"
}

function getScoreBgClass(score: number) {
  if (score >= 5) return "bg-emerald-100 text-emerald-800 border-emerald-200"
  if (score >= 4) return "bg-lime-100 text-lime-800 border-lime-200"
  if (score >= 3) return "bg-amber-100 text-amber-800 border-amber-200"
  if (score >= 2) return "bg-orange-100 text-orange-800 border-orange-200"
  if (score >= 1) return "bg-rose-100 text-rose-800 border-rose-200"
  return "bg-white"
}

function getPercentBgClass(percent: number) {
  if (percent >= 80) return "bg-emerald-100 text-emerald-800 border-emerald-200"
  if (percent >= 60) return "bg-lime-100 text-lime-800 border-lime-200"
  if (percent >= 40) return "bg-amber-100 text-amber-800 border-amber-200"
  if (percent > 0) return "bg-rose-100 text-rose-800 border-rose-200"
  return "bg-slate-100 text-slate-600 border-slate-200"
}

function computeFunctionalEvaluation(raw?: Partial<Evaluation>) {
  const answers = raw?.functional_answers || {}
  const scores = Object.fromEntries(FUNCTIONAL_GIFTS.map((g) => [g, 0])) as Record<string, number>
  const globalDimensions: Record<FunctionalDimension, number[]> = {
    inclinacion: [],
    disfrute: [],
    confirmacion: [],
    fruto: [],
  }

  FUNCTIONAL_QUESTIONS.forEach((q) => {
    const value = Number(answers[q.id] || 0)
    scores[q.gift] += value
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
  const globalDimensions: Record<SpiritualDimension, number[]> = {
    sensibilidad: [],
    fruto: [],
    confirmacion: [],
  }

  SPIRITUAL_QUESTIONS.forEach((q) => {
    const value = Number(answers[q.id] || 0)
    scores[q.gift] += value
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
    globalDimensions: {
      sensibilidad: average(globalDimensions.sensibilidad) / 5,
      fruto: average(globalDimensions.fruto) / 5,
      confirmacion: average(globalDimensions.confirmacion) / 5,
    },
  }
}

function recognitionSummaryForUser(userId: number, recognitions: PeerRecognition[]) {
  const rows = recognitions.filter((r) => r.to_profile_id === userId)
  const counts = Object.fromEntries(ALL_GIFTS.map((g) => [g, 0])) as Record<string, number>
  rows.forEach((r) => r.gifts.forEach((gift) => (counts[gift] += 1)))
  return {
    totalRecognizers: [...new Set(rows.map((r) => r.from_profile_id))].length,
    counts,
    top: topNFromScores(counts, 22),
  }
}

function buildGroupReport(group: Group, profiles: Profile[], evaluations: Record<number, Evaluation>, recognitions: PeerRecognition[]) {
  const members = profiles.filter((p) => group.memberIds.includes(p.id))
  const completeMembers = members.filter((p) => {
    const ev = evaluations[p.id] || {}
    return computeFunctionalEvaluation(ev).answered === 48 && computeSpiritualEvaluation(ev).answered === 30
  })

  const functionalAgg = Object.fromEntries(FUNCTIONAL_GIFTS.map((g) => [g, 0])) as Record<string, number>
  const spiritualAgg = Object.fromEntries(SPIRITUAL_GIFTS.map((g) => [g, 0])) as Record<string, number>
  const allAgg = Object.fromEntries(ALL_GIFTS.map((g) => [g, 0])) as Record<string, number>
  const confirmations = Object.fromEntries(ALL_GIFTS.map((g) => [g, 0])) as Record<string, number>

  completeMembers.forEach((member) => {
    const ev = evaluations[member.id] || {}
    const f = computeFunctionalEvaluation(ev)
    const s = computeSpiritualEvaluation(ev)

    Object.entries(f.scores).forEach(([gift, score]) => {
      functionalAgg[gift] += score
      allAgg[gift] += score
    })
    Object.entries(s.scores).forEach(([gift, score]) => {
      spiritualAgg[gift] += score
      allAgg[gift] += score
    })
  })

  recognitions
    .filter((r) => group.memberIds.includes(r.to_profile_id))
    .forEach((r) => r.gifts.forEach((gift) => (confirmations[gift] += 1)))

  return {
    members,
    completeMembers,
    functionalAgg,
    spiritualAgg,
    allAgg,
    confirmations,
    top22: topNFromScores(allAgg, 22),
    topConfirmations: topNFromScores(confirmations, 22),
  }
}

function buildGiftInGroupReport(group: Group, gift: string, profiles: Profile[], evaluations: Record<number, Evaluation>, recognitions: PeerRecognition[]) {
  const members = profiles.filter((p) => group.memberIds.includes(p.id))
  const rows = members.map((member) => {
    const ev = evaluations[member.id] || {}
    const f = computeFunctionalEvaluation(ev)
    const s = computeSpiritualEvaluation(ev)
    const score = gift in f.scores ? f.scores[gift] : gift in s.scores ? s.scores[gift] : 0
    const seen = recognitions
      .filter((r) => r.to_profile_id === member.id)
      .reduce((acc, r) => acc + r.gifts.filter((g) => g === gift).length, 0)

    return {
      member,
      score,
      confirmations: seen,
      completion: ((f.answered / 48) * 100 + (s.answered / 30) * 100) / 2,
      semaphore: f.semaphore,
    }
  })

  const sorted = [...rows].sort((a, b) => b.score - a.score)
  const totalScore = rows.reduce((a, b) => a + b.score, 0)
  const totalConfirmations = rows.reduce((a, b) => a + b.confirmations, 0)
  const avgCompletion = rows.length ? rows.reduce((a, b) => a + b.completion, 0) / rows.length : 0

  return {
    gift,
    rows: sorted,
    totalScore,
    totalConfirmations,
    avgCompletion,
  }
}

function interpretPerson(
  profile: Profile,
  functionalTop: Array<{ name: string; score: number }>,
  spiritualTop: Array<{ name: string; score: number }>,
  seenByOthers: Array<{ name: string; score: number }>,
) {
  const f1 = functionalTop[0]?.name || "Sin dato"
  const f2 = functionalTop[1]?.name || "Sin dato"
  const s1 = spiritualTop[0]?.name || "Sin dato"
  const s2 = spiritualTop[1]?.name || "Sin dato"
  const c1 = seenByOthers[0]?.name || "Sin confirmación externa"

  return {
    technical: `El perfil de ${profile.full_name} presenta mayor fortaleza funcional en ${f1}${f2 !== "Sin dato" ? ` y ${f2}` : ""}, con acentos espirituales en ${s1}${s2 !== "Sin dato" ? ` y ${s2}` : ""}. La confirmación comunitaria más visible apunta a ${c1}.`,
    ministerial: `En lectura ministerial, este perfil parece apto para servir donde pueda combinar gracia funcional y madurez espiritual. Conviene observar continuidad, fruto, confirmación comunitaria y disposición al servicio antes de consolidar una ubicación estable.`,
    recommendations: [
      `Ubicar inicialmente en espacios donde pueda ejercer ${f1}.`,
      s1 !== "Sin dato" ? `Acompañar su desarrollo espiritual en ${s1}.` : "Fortalecer acompañamiento espiritual y seguimiento.",
      c1 !== "Sin confirmación externa" ? `Tomar en cuenta la confirmación comunitaria en ${c1}.` : "Promover más observación y retroalimentación del grupo.",
    ],
  }
}

function interpretGroup(
  groupName: string,
  top22: Array<{ name: string; score: number }>,
  confirmations: Array<{ name: string; score: number }>,
) {
  const g1 = top22[0]?.name || "Sin dato"
  const g2 = top22[1]?.name || "Sin dato"
  const c1 = confirmations[0]?.name || "Sin confirmaciones destacadas"

  return {
    technical: `El grupo ${groupName} concentra mayor peso en ${g1}${g2 !== "Sin dato" ? ` y ${g2}` : ""}. En validación comunitaria sobresale ${c1}, lo que sugiere una identidad grupal relativamente definida.`,
    ministerial: `Ministerialmente, este grupo muestra potencial para operar con mayor cohesión si fortalece los dones predominantes y acompaña los menos visibles, procurando equilibrio entre dirección, cuidado, servicio y fruto espiritual.`,
    recommendations: [
      `Consolidar funciones donde el grupo ya muestra fortaleza en ${g1}.`,
      "Detectar dones menos visibles para no depender siempre de los mismos perfiles.",
      "Usar la confirmación externa como criterio adicional para ordenar responsabilidades.",
    ],
  }
}

function interpretGift(groupName: string, gift: string, totalScore: number, totalConfirmations: number) {
  return {
    technical: `Dentro del grupo ${groupName}, el don ${gift} presenta un puntaje acumulado de ${totalScore} y ${totalConfirmations} confirmaciones. Esto ayuda a distinguir perfiles fuertes, perfiles emergentes y necesidades de formación.`,
    ministerial: `En lectura ministerial, ${gift} debe reconocerse no solo por intensidad, sino por fruto, humildad, servicio y confirmación comunitaria. Un don fuerte necesita encauce, acompañamiento y contexto correcto.`,
    recommendations: [
      `Reconocer a quienes muestran mayor consistencia en ${gift}.`,
      "Acompañar a quienes tienen puntaje medio pero potencial evidente.",
      "Cruzar puntaje, fruto y confirmación antes de asignar responsabilidades estables.",
    ],
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

      const evalMap = Object.fromEntries((evaluationsRes.data || []).map((ev) => [ev.profile_id, ev])) as Record<number, Evaluation>
      const groups = (groupsRes.data || []).map((g) => ({
        ...g,
        memberIds: (membersRes.data || []).filter((m) => m.group_id === g.id).map((m) => m.profile_id),
      })) as Group[]

      const nextState: AppState = {
        profiles: (profilesRes.data || []) as Profile[],
        evaluations: evalMap,
        groups,
        peerRecognitions: (recognitionsRes.data || []) as PeerRecognition[],
        nextProfileId: (((profilesRes.data || []).at(-1) as Profile | undefined)?.id || 0) + 1,
        nextGroupId: (((groupsRes.data || []).at(-1) as Group | undefined)?.id || 0) + 1,
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
          memberIds.map((profile_id) => ({ group_id: (data as Group).id, profile_id })),
        )
        if (memberError) throw memberError
      }
      return { ...(data as Group), memberIds }
    },
    async updateGroup(groupId: number, name: string, memberIds: number[]) {
      const { error } = await supabase.from("groups").update({ name }).eq("id", groupId)
      if (error) throw error
      const del = await supabase.from("group_members").delete().eq("group_id", groupId)
      if (del.error) throw del.error
      if (memberIds.length) {
        const { error: memberError } = await supabase.from("group_members").insert(
          memberIds.map((profile_id) => ({ group_id: groupId, profile_id })),
        )
        if (memberError) throw memberError
      }
    },
    async deleteGroup(groupId: number) {
      await supabase.from("group_members").delete().eq("group_id", groupId)
      await supabase.from("groups").delete().eq("id", groupId)
    },
    async deleteProfile(profileId: number) {
      await supabase.from("peer_recognitions").delete().eq("from_profile_id", profileId)
      await supabase.from("peer_recognitions").delete().eq("to_profile_id", profileId)
      await supabase.from("group_members").delete().eq("profile_id", profileId)
      await supabase.from("evaluations").delete().eq("profile_id", profileId)
      await supabase.from("profiles").delete().eq("id", profileId)
    },
    async replaceRecognition(payload: Omit<PeerRecognition, "id">) {
      await supabase
        .from("peer_recognitions")
        .delete()
        .eq("from_profile_id", payload.from_profile_id)
        .eq("to_profile_id", payload.to_profile_id)
      const { error } = await supabase.from("peer_recognitions").insert(payload)
      if (error) throw error
    },
  }
}

function createPdf(title: string) {
  const pdf = new jsPDF("p", "mm", "a4")
  const pageWidth = 210
  const pageHeight = 297
  const margin = 14
  let y = margin

  const addPageIfNeeded = (needed = 8) => {
    if (y + needed > pageHeight - margin) {
      pdf.addPage()
      y = margin
    }
  }

  const line = (text: string, size = 10, bold = false) => {
    addPageIfNeeded(7)
    pdf.setFont("helvetica", bold ? "bold" : "normal")
    pdf.setFontSize(size)
    const lines = pdf.splitTextToSize(text, pageWidth - margin * 2)
    pdf.text(lines, margin, y)
    y += lines.length * (size * 0.42 + 1.2)
  }

  const divider = () => {
    addPageIfNeeded(4)
    pdf.setDrawColor(180)
    pdf.line(margin, y, pageWidth - margin, y)
    y += 4
  }

  const section = (text: string) => {
    y += 2
    line(text, 12, true)
    y += 1
  }

  const kv = (label: string, value: string) => {
    line(`${label}: ${value}`, 10, false)
  }

  const bullets = (items: string[]) => {
    items.forEach((item) => line(`• ${item}`, 10, false))
  }

  const paragraph = (text: string) => {
    line(text, 10, false)
  }

  const table = (headers: string[], rows: string[][], colWidths?: number[]) => {
    const widths =
      colWidths && colWidths.length === headers.length
        ? colWidths
        : headers.map(() => (pageWidth - margin * 2) / headers.length)

    const drawRow = (cells: string[], isHeader = false) => {
      const cellLines = cells.map((cell, i) => pdf.splitTextToSize(cell || "", widths[i] - 2))
      const rowHeight = Math.max(...cellLines.map((l) => l.length), 1) * 4 + 2
      addPageIfNeeded(rowHeight + 2)

      let x = margin
      pdf.setFont("helvetica", isHeader ? "bold" : "normal")
      pdf.setFontSize(9)

      cells.forEach((_, i) => {
        pdf.rect(x, y, widths[i], rowHeight)
        pdf.text(cellLines[i], x + 1, y + 4)
        x += widths[i]
      })
      y += rowHeight + 1
    }

    drawRow(headers, true)
    rows.forEach((r) => drawRow(r, false))
    y += 3
  }

  line(title, 17, true)
  line("Plataforma Dones Amistad Irapuato", 11, false)
  divider()

  return { save: (fileName: string) => pdf.save(fileName), kv, section, bullets, paragraph, table }
}

function exportPersonReportPdf(input: {
  fileName: string
  generatedAt: string
  profile: Profile
  reliability: string
  semaphore: string
  functionalCompletion: number
  spiritualCompletion: number
  topFunctional: Array<{ name: string; score: number }>
  topSpiritual: Array<{ name: string; score: number }>
  seenByOthers: Array<{ name: string; score: number }>
  functionalScores: Array<[string, number]>
  spiritualScores: Array<[string, number]>
  interpretation: ReturnType<typeof interpretPerson>
}) {
  const doc = createPdf("Reporte individual híbrido de dones")
  doc.kv("Fecha de generación", input.generatedAt)
  doc.kv("Nombre", input.profile.full_name)
  doc.kv("ID", String(input.profile.id))
  doc.kv("Edad", input.profile.age != null ? String(input.profile.age) : "-")
  doc.kv("Sexo", input.profile.sex || "-")
  doc.kv("Iglesia", input.profile.church || "-")
  doc.kv("Área de servicio", input.profile.service_areas || "-")

  doc.section("Resumen ejecutivo")
  doc.kv("Confiabilidad", input.reliability)
  doc.kv("Semáforo", input.semaphore)
  doc.kv("Avance funcional", `${Math.round(input.functionalCompletion)}%`)
  doc.kv("Avance espiritual", `${Math.round(input.spiritualCompletion)}%`)

  doc.section("Lectura técnica")
  doc.paragraph(input.interpretation.technical)

  doc.section("Lectura ministerial")
  doc.paragraph(input.interpretation.ministerial)

  doc.section("Recomendaciones")
  doc.bullets(input.interpretation.recommendations)

  doc.section("Top funcional")
  doc.table(["Don", "Puntaje"], input.topFunctional.map((x) => [x.name, String(x.score)]), [150, 32])

  doc.section("Top espiritual")
  doc.table(["Don", "Puntaje"], input.topSpiritual.map((x) => [x.name, String(x.score)]), [150, 32])

  doc.section("Dones que otros ven en mí")
  doc.table(["Don", "Confirmaciones"], input.seenByOthers.map((x) => [x.name, String(x.score)]), [150, 32])

  doc.section("Clasificación funcional completa")
  doc.table(["Don funcional", "Puntaje"], input.functionalScores.map(([n, s]) => [n, String(s)]), [150, 32])

  doc.section("Clasificación espiritual completa")
  doc.table(["Don espiritual", "Puntaje"], input.spiritualScores.map(([n, s]) => [n, String(s)]), [150, 32])

  doc.save(input.fileName)
}

function exportGroupReportPdf(input: {
  fileName: string
  generatedAt: string
  groupName: string
  members: number
  completeMembers: number
  top22: Array<{ name: string; score: number }>
  confirmations: Array<{ name: string; score: number }>
  functionalAgg: Array<[string, number]>
  spiritualAgg: Array<[string, number]>
  interpretation: ReturnType<typeof interpretGroup>
}) {
  const doc = createPdf("Reporte grupal híbrido de dones")
  doc.kv("Fecha de generación", input.generatedAt)
  doc.kv("Grupo", input.groupName)
  doc.kv("Miembros", String(input.members))
  doc.kv("Miembros completos", String(input.completeMembers))

  doc.section("Lectura técnica")
  doc.paragraph(input.interpretation.technical)

  doc.section("Lectura ministerial")
  doc.paragraph(input.interpretation.ministerial)

  doc.section("Recomendaciones")
  doc.bullets(input.interpretation.recommendations)

  doc.section("Top 22 del grupo")
  doc.table(["Don", "Puntaje"], input.top22.map((x) => [x.name, String(x.score)]), [150, 32])

  doc.section("Dones más confirmados por terceros")
  doc.table(["Don", "Confirmaciones"], input.confirmations.map((x) => [x.name, String(x.score)]), [150, 32])

  doc.section("Concentrado funcional")
  doc.table(["Don funcional", "Puntaje"], input.functionalAgg.map(([n, s]) => [n, String(s)]), [150, 32])

  doc.section("Concentrado espiritual")
  doc.table(["Don espiritual", "Puntaje"], input.spiritualAgg.map(([n, s]) => [n, String(s)]), [150, 32])

  doc.save(input.fileName)
}

function exportGiftInGroupPdf(input: {
  fileName: string
  generatedAt: string
  groupName: string
  gift: string
  totalScore: number
  totalConfirmations: number
  avgCompletion: number
  rows: Array<{
    full_name: string
    id: number
    score: number
    confirmations: number
    completion: number
    semaphore: string
  }>
  interpretation: ReturnType<typeof interpretGift>
}) {
  const doc = createPdf("Reporte híbrido por don dentro del grupo")
  doc.kv("Fecha de generación", input.generatedAt)
  doc.kv("Grupo", input.groupName)
  doc.kv("Don", input.gift)
  doc.kv("Puntaje total", String(input.totalScore))
  doc.kv("Confirmaciones", String(input.totalConfirmations))
  doc.kv("Promedio completado", `${Math.round(input.avgCompletion)}%`)

  doc.section("Lectura técnica")
  doc.paragraph(input.interpretation.technical)

  doc.section("Lectura ministerial")
  doc.paragraph(input.interpretation.ministerial)

  doc.section("Recomendaciones")
  doc.bullets(input.interpretation.recommendations)

  doc.section("Detalle por miembro")
  doc.table(
    ["Nombre", "ID", "Puntaje", "Confirm.", "% Compl.", "Semáforo"],
    input.rows.map((r) => [
      r.full_name,
      String(r.id),
      String(r.score),
      String(r.confirmations),
      `${Math.round(r.completion)}%`,
      r.semaphore,
    ]),
    [70, 16, 22, 22, 24, 28],
  )

  doc.save(input.fileName)
}

function ScoreSelect({
  value,
  onChange,
}: {
  value: number | ""
  onChange: (value: number | "") => void
}) {
  const numeric = value === "" ? 0 : Number(value)
  return (
    <Select value={value === "" ? "blank" : String(value)} onValueChange={(v) => onChange(v === "blank" ? "" : Number(v))}>
      <SelectTrigger className={`h-9 border ${getScoreBgClass(numeric)}`}>
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

function Metric({ label, value, percent }: { label: string; value: string | number; percent?: number }) {
  return (
    <div className={`rounded-2xl border p-3 text-center ${percent !== undefined ? getPercentBgClass(percent) : "bg-white"}`}>
      <div className="text-xs">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  )
}

function SectionHeader({
  title,
  description,
  backTo,
  onBack,
  action,
}: {
  title: string
  description?: string
  backTo?: string
  onBack?: () => void
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="flex items-center gap-2">
          {backTo && onBack ? (
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Regresar
            </Button>
          ) : null}
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {action}
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
          entries.map(([gift, score]) => {
            const percent = max ? (score / max) * 100 : 0
            return (
              <div key={gift} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{gift}</span>
                  <span className={`rounded-full border px-2 py-0.5 font-medium ${getPercentBgClass(percent)}`}>
                    {score}
                  </span>
                </div>
                <Progress value={percent} />
              </div>
            )
          })
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
              <Badge className={getPercentBgClass(item.score * 5)} variant="outline">
                {item.score}
              </Badge>
            </div>
          ))
        ) : (
          <div className="text-sm text-slate-500">Sin datos</div>
        )}
      </CardContent>
    </Card>
  )
}

function InterpretationCard({
  title,
  body,
}: {
  title: string
  body: string
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-700">{body}</CardContent>
    </Card>
  )
}

export default function Page() {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

  const [state, setState] = useState<AppState>(buildEmptyState())
  const [adapter, setAdapter] = useState<ReturnType<typeof buildLocalAdapter> | ReturnType<typeof buildSupabaseAdapter> | null>(null)

  const [activeTab, setActiveTab] = useState("inicio")
  const [reportMode, setReportMode] = useState<ReportMode>("persona")

  const [selectedProfileId, setSelectedProfileId] = useState("")
  const [selectedGroupId, setSelectedGroupId] = useState("")
  const [selectedGift, setSelectedGift] = useState("")
  const [search, setSearch] = useState("")

  const [saveMessage, setSaveMessage] = useState("")
  const [, setConnectionState] = useState<ConnectionState>({
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

  const [editingGroupId, setEditingGroupId] = useState("")
  const [editingGroupName, setEditingGroupName] = useState("")
  const [editingGroupMembers, setEditingGroupMembers] = useState<number[]>([])

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
            message: "Conectado a Supabase",
          })
          return
        } catch {
          // fallback
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

  function flashSaved(message: string) {
    setSaveMessage(message)
    window.setTimeout(() => setSaveMessage(""), 2500)
  }

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
  const giftReport = selectedGroup && selectedGift ? buildGiftInGroupReport(selectedGroup, selectedGift, state.profiles, state.evaluations, state.peerRecognitions) : null

  const personInterpretation =
    selectedProfile && functionalReport && spiritualReport && peerSummary
      ? interpretPerson(selectedProfile, functionalReport.top3, spiritualReport.top3, peerSummary.top.slice(0, 10))
      : null

  const groupInterpretation =
    selectedGroup && groupReport
      ? interpretGroup(selectedGroup.name, groupReport.top22, groupReport.topConfirmations)
      : null

  const giftInterpretation =
    selectedGroup && giftReport
      ? interpretGift(selectedGroup.name, giftReport.gift, giftReport.totalScore, giftReport.totalConfirmations)
      : null

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

  async function persistLocal(nextState: AppState) {
    if (adapter?.mode === "local") {
      await adapter.persist(nextState)
    } else {
      setState(nextState)
    }
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

    setUserForm({ full_name: "", age: "", sex: "", church: "", service_areas: "" })
    flashSaved("Usuario guardado correctamente")
  }

  async function saveCurrentEvaluation() {
    if (!selectedProfileId || !selectedEvaluation) return
    if (adapter?.mode === "supabase") {
      await adapter.upsertEvaluation(selectedEvaluation)
    }
    flashSaved("Evaluación guardada correctamente")
  }

  async function deleteProfile(profileId: number) {
    if (!confirm("¿Eliminar este usuario completo?")) return

    if (adapter?.mode === "supabase") {
      await adapter.deleteProfile(profileId)
    }

    const nextGroups = state.groups.map((g) => ({
      ...g,
      memberIds: g.memberIds.filter((id) => id !== profileId),
    }))

    const nextRecognitions = state.peerRecognitions.filter(
      (r) => r.from_profile_id !== profileId && r.to_profile_id !== profileId,
    )

    const nextEvaluations = { ...state.evaluations }
    delete nextEvaluations[profileId]

    const nextState: AppState = {
      ...state,
      profiles: state.profiles.filter((p) => p.id !== profileId),
      evaluations: nextEvaluations,
      groups: nextGroups,
      peerRecognitions: nextRecognitions,
    }

    if (selectedProfileId === String(profileId)) setSelectedProfileId("")
    await persistLocal(nextState)
    flashSaved("Usuario eliminado correctamente")
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
    flashSaved("Grupo guardado correctamente")
  }

  function startEditGroup(group: Group) {
    setEditingGroupId(String(group.id))
    setEditingGroupName(group.name)
    setEditingGroupMembers(group.memberIds)
  }

  async function saveGroupEdit() {
    if (!editingGroupId || !editingGroupName.trim()) return
    const gid = Number(editingGroupId)
    const memberIds = [...new Set(editingGroupMembers)].slice(0, 300)

    if (adapter?.mode === "supabase") {
      await adapter.updateGroup(gid, editingGroupName.trim(), memberIds)
    }

    const nextState = {
      ...state,
      groups: state.groups.map((g) =>
        g.id === gid ? { ...g, name: editingGroupName.trim(), memberIds } : g,
      ),
    }
    await persistLocal(nextState)
    setEditingGroupId("")
    setEditingGroupName("")
    setEditingGroupMembers([])
    flashSaved("Grupo actualizado correctamente")
  }

  async function deleteGroup(groupId: number) {
    if (!confirm("¿Eliminar este grupo completo?")) return

    if (adapter?.mode === "supabase") {
      await adapter.deleteGroup(groupId)
    }

    const nextState = {
      ...state,
      groups: state.groups.filter((g) => g.id !== groupId),
    }
    if (selectedGroupId === String(groupId)) setSelectedGroupId("")
    await persistLocal(nextState)
    flashSaved("Grupo eliminado correctamente")
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
    flashSaved("Confirmación guardada correctamente")
  }

  return (
    <div className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardContent className="p-5 md:p-7">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="text-sm font-medium text-slate-500">Plataforma Dones Amistad Irapuato · v11</div>
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                  Sistema multiusuario de dones funcionales y espirituales
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Reportes híbridos, PDF mejorado y operación limpia para usuarios.
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

        {saveMessage ? (
          <Alert>
            <Save className="h-4 w-4" />
            <AlertDescription>{saveMessage}</AlertDescription>
          </Alert>
        ) : null}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <ScrollArea className="w-full whitespace-nowrap rounded-2xl border bg-white">
            <TabsList className="inline-flex h-auto w-max min-w-full justify-start rounded-2xl bg-white p-2">
              <TabsTrigger value="inicio">Inicio</TabsTrigger>
              <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
              <TabsTrigger value="evaluar">Evaluar</TabsTrigger>
              <TabsTrigger value="grupos">Grupos</TabsTrigger>
              <TabsTrigger value="confirmar">Dones que veo en...</TabsTrigger>
              <TabsTrigger value="reportes">Reportes</TabsTrigger>
            </TabsList>
          </ScrollArea>

          <TabsContent value="inicio" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FeatureCard
                icon={UserPlus}
                title="Usuarios"
                description="Crear, revisar y eliminar usuarios."
                onClick={() => setActiveTab("usuarios")}
              />
              <FeatureCard
                icon={ClipboardCheck}
                title="Evaluar"
                description="Guardar evaluaciones con colores 1–5."
                onClick={() => setActiveTab("evaluar")}
              />
              <FeatureCard
                icon={Users}
                title="Grupos"
                description="Agregar, editar, quitar miembros y eliminar grupos."
                onClick={() => setActiveTab("grupos")}
              />
              <FeatureCard
                icon={BarChart3}
                title="Reportes"
                description="Separados por persona, grupo y don."
                onClick={() => setActiveTab("reportes")}
              />
            </div>
          </TabsContent>

          <TabsContent value="usuarios" className="space-y-4">
            <SectionHeader
              title="Usuarios"
              description="Crear y administrar registros completos."
              backTo="inicio"
              onBack={() => setActiveTab("inicio")}
              action={
                <Button onClick={createProfile}>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar usuario
                </Button>
              }
            />

            <Card className="rounded-3xl">
              <CardHeader><CardTitle>Captura de usuario</CardTitle></CardHeader>
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
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
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
              </CardContent>
            </Card>

            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>Administrar usuarios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar persona..." />
                </div>

                {filteredProfiles.map((profile) => (
                  <div key={profile.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4">
                    <div>
                      <div className="font-semibold">{profile.full_name}</div>
                      <div className="text-sm text-slate-500">ID {profile.id} · {profile.church || "-"} · {profile.service_areas || "-"}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => { setSelectedProfileId(String(profile.id)); setReportMode("persona"); setActiveTab("reportes") }}>
                        Ver reporte
                      </Button>
                      <Button variant="outline" onClick={() => { setSelectedProfileId(String(profile.id)); setActiveTab("evaluar") }}>
                        Evaluar
                      </Button>
                      <Button variant="destructive" onClick={() => deleteProfile(profile.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evaluar" className="space-y-4">
            <SectionHeader
              title="Evaluación"
              description="Captura funcional y espiritual con guardado visible."
              backTo="inicio"
              onBack={() => setActiveTab("inicio")}
              action={
                <Button onClick={saveCurrentEvaluation}>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar evaluación
                </Button>
              }
            />

            <Card className="rounded-3xl">
              <CardHeader><CardTitle>Seleccionar usuario</CardTitle></CardHeader>
              <CardContent>
                <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar usuario" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={String(profile.id)}>
                        {profile.id} · {profile.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {selectedProfile && selectedEvaluation && functionalReport && spiritualReport ? (
              <>
                <div className="grid gap-4 xl:grid-cols-2">
                  <Card className="rounded-2xl">
                    <CardHeader><CardTitle className="text-base">Resumen funcional</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <Metric label="Contestadas" value={`${functionalReport.answered}/48`} percent={functionalReport.completionPct * 100} />
                        <Metric label="Confiabilidad" value={functionalReport.reliability} percent={functionalReport.completionPct * 100} />
                        <Metric label="Semáforo" value={functionalReport.semaphore} percent={functionalReport.maturityPct * 100} />
                        <Metric label="Madurez" value={`${Math.round(functionalReport.maturityPct * 100)}%`} percent={functionalReport.maturityPct * 100} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl">
                    <CardHeader><CardTitle className="text-base">Resumen espiritual</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <Metric label="Contestadas" value={`${spiritualReport.answered}/30`} percent={spiritualReport.completionPct * 100} />
                        <Metric label="Confiabilidad" value={spiritualReport.reliability} percent={spiritualReport.completionPct * 100} />
                        <Metric label="Semáforo" value={spiritualReport.semaphore} percent={spiritualReport.maturityPct * 100} />
                        <Metric label="Madurez" value={`${Math.round(spiritualReport.maturityPct * 100)}%`} percent={spiritualReport.maturityPct * 100} />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="rounded-2xl">
                  <CardHeader><CardTitle className="text-base">Capa funcional · 48 preguntas</CardTitle></CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[560px] pr-3">
                      <div className="space-y-4">
                        {FUNCTIONAL_GIFTS.map((gift) => {
                          const giftQuestions = FUNCTIONAL_QUESTIONS.filter((q) => q.gift === gift)
                          return (
                            <div key={gift} className="rounded-2xl border p-4">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div className="font-semibold">{gift}</div>
                                <Badge className={getPercentBgClass((functionalReport.scores[gift] / 20) * 100)} variant="outline">
                                  Total {functionalReport.scores[gift]}
                                </Badge>
                              </div>
                              <div className="space-y-3">
                                {giftQuestions.map((question, index) => (
                                  <div key={question.id} className="grid grid-cols-[1fr_110px] gap-3 rounded-2xl border p-3">
                                    <div>
                                      <div className="mb-1 flex flex-wrap items-center gap-2">
                                        <span className="text-xs text-slate-500">{index + 1}. {FUNCTIONAL_DIMENSION_LABELS[question.dimension]}</span>
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
                  <CardHeader><CardTitle className="text-base">Capa espiritual · 30 preguntas</CardTitle></CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[560px] pr-3">
                      <div className="space-y-4">
                        {SPIRITUAL_GIFTS.map((gift) => {
                          const giftQuestions = SPIRITUAL_QUESTIONS.filter((q) => q.gift === gift)
                          return (
                            <div key={gift} className="rounded-2xl border p-4">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div className="font-semibold">{gift}</div>
                                <Badge className={getPercentBgClass((spiritualReport.scores[gift] / 15) * 100)} variant="outline">
                                  Total {spiritualReport.scores[gift]}
                                </Badge>
                              </div>
                              <div className="space-y-3">
                                {giftQuestions.map((question, index) => (
                                  <div key={question.id} className="grid grid-cols-[1fr_110px] gap-3 rounded-2xl border p-3">
                                    <div>
                                      <div className="mb-1 flex flex-wrap items-center gap-2">
                                        <span className="text-xs text-slate-500">{index + 1}. {SPIRITUAL_DIMENSION_LABELS[question.dimension]}</span>
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
              </>
            ) : null}
          </TabsContent>

          <TabsContent value="grupos" className="space-y-4">
            <SectionHeader
              title="Control de grupos"
              description="Crear, actualizar miembros, quitar usuarios y eliminar grupos completos."
              backTo="inicio"
              onBack={() => setActiveTab("inicio")}
              action={
                <Button onClick={createGroup}>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar grupo
                </Button>
              }
            />

            <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
              <Card className="rounded-3xl">
                <CardHeader><CardTitle>Crear grupo</CardTitle></CardHeader>
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
                            <span className="text-sm">{profile.id} · {profile.full_name}</span>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl">
                <CardHeader><CardTitle>Administrar grupos existentes</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {state.groups.map((group) => (
                    <div key={group.id} className="space-y-3 rounded-2xl border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold">{group.name}</div>
                          <div className="text-sm text-slate-500">{group.memberIds.length} miembros</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" onClick={() => { setSelectedGroupId(String(group.id)); setReportMode("grupo"); setActiveTab("reportes") }}>
                            Ver reporte
                          </Button>
                          <Button variant="outline" onClick={() => startEditGroup(group)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </Button>
                          <Button variant="destructive" onClick={() => deleteGroup(group.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar grupo
                          </Button>
                        </div>
                      </div>

                      <div className="text-sm text-slate-500">
                        {group.memberIds.map((id) => profiles.find((p) => p.id === id)?.full_name).filter(Boolean).join(", ")}
                      </div>

                      {editingGroupId === String(group.id) ? (
                        <div className="space-y-3 rounded-2xl border bg-slate-50 p-4">
                          <div className="space-y-2">
                            <Label>Nombre del grupo</Label>
                            <Input value={editingGroupName} onChange={(e) => setEditingGroupName(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>Actualizar miembros del grupo</Label>
                            <ScrollArea className="h-56 rounded-2xl border bg-white p-3">
                              <div className="space-y-3">
                                {profiles.map((profile) => (
                                  <label key={profile.id} className="flex items-start gap-3">
                                    <Checkbox
                                      checked={editingGroupMembers.includes(profile.id)}
                                      onCheckedChange={(checked) => {
                                        const isChecked = Boolean(checked)
                                        setEditingGroupMembers((prev) =>
                                          isChecked
                                            ? [...new Set([...prev, profile.id])].slice(0, 300)
                                            : prev.filter((x) => x !== profile.id),
                                        )
                                      }}
                                    />
                                    <span className="text-sm">{profile.id} · {profile.full_name}</span>
                                  </label>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button onClick={saveGroupEdit}>
                              <Save className="mr-2 h-4 w-4" />
                              Guardar cambios
                            </Button>
                            <Button variant="secondary" onClick={() => { setEditingGroupId(""); setEditingGroupName(""); setEditingGroupMembers([]) }}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="confirmar" className="space-y-4">
            <SectionHeader
              title="Dones que veo en..."
              description="Confirma dones observados en otras personas registradas."
              backTo="inicio"
              onBack={() => setActiveTab("inicio")}
              action={
                <Button onClick={saveRecognition}>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar confirmación
                </Button>
              }
            />

            <Card className="rounded-3xl">
              <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Quién confirma</Label>
                  <Select value={fromProfileId} onValueChange={setFromProfileId}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
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
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reportes" className="space-y-4">
            <SectionHeader
              title="Reportes"
              description="Generación separada por persona, grupo o don dentro del grupo."
              backTo="inicio"
              onBack={() => setActiveTab("inicio")}
            />

            <Tabs value={reportMode} onValueChange={(v) => setReportMode(v as ReportMode)} className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="persona">Reporte por persona</TabsTrigger>
                <TabsTrigger value="grupo">Reporte por grupo</TabsTrigger>
                <TabsTrigger value="don">Reporte por don del grupo</TabsTrigger>
              </TabsList>

              <TabsContent value="persona" className="space-y-4">
                <Card className="rounded-3xl">
                  <CardHeader><CardTitle>Seleccionar persona</CardTitle></CardHeader>
                  <CardContent className="flex flex-col gap-3 md:flex-row md:items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Persona</Label>
                      <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar persona" /></SelectTrigger>
                        <SelectContent>
                          {profiles.map((profile) => (
                            <SelectItem key={profile.id} value={String(profile.id)}>
                              {profile.id} · {profile.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="outline"
                      disabled={!selectedProfile || !functionalReport || !spiritualReport || !peerSummary || !personInterpretation}
                      onClick={() => {
                        if (!selectedProfile || !functionalReport || !spiritualReport || !peerSummary || !personInterpretation) return
                        exportPersonReportPdf({
                          fileName: `Reporte_Persona_${selectedProfile.full_name.replace(/\s+/g, "_")}.pdf`,
                          generatedAt: new Date().toLocaleString(),
                          profile: selectedProfile,
                          reliability: functionalReport.reliability,
                          semaphore: functionalReport.semaphore,
                          functionalCompletion: functionalReport.completionPct * 100,
                          spiritualCompletion: spiritualReport.completionPct * 100,
                          topFunctional: functionalReport.top3,
                          topSpiritual: spiritualReport.top3,
                          seenByOthers: peerSummary.top.slice(0, 10),
                          functionalScores: Object.entries(functionalReport.scores).sort((a, b) => b[1] - a[1]),
                          spiritualScores: Object.entries(spiritualReport.scores).sort((a, b) => b[1] - a[1]),
                          interpretation: personInterpretation,
                        })
                        flashSaved("PDF individual generado correctamente")
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Exportar PDF
                    </Button>
                  </CardContent>
                </Card>

                {selectedProfile && functionalReport && spiritualReport && peerSummary && personInterpretation ? (
                  <Card className="rounded-3xl">
                    <CardHeader>
                      <CardTitle>Reporte de persona · {selectedProfile.full_name}</CardTitle>
                      <CardDescription>
                        ID {selectedProfile.id} · {selectedProfile.church || "-"} · {selectedProfile.service_areas || "-"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid gap-3 md:grid-cols-4">
                        <Metric label="Confiabilidad" value={functionalReport.reliability} percent={functionalReport.completionPct * 100} />
                        <Metric label="Semáforo" value={functionalReport.semaphore} percent={functionalReport.maturityPct * 100} />
                        <Metric label="Funcional" value={`${Math.round(functionalReport.completionPct * 100)}%`} percent={functionalReport.completionPct * 100} />
                        <Metric label="Espiritual" value={`${Math.round(spiritualReport.completionPct * 100)}%`} percent={spiritualReport.completionPct * 100} />
                      </div>

                      <div className="grid gap-4 xl:grid-cols-2">
                        <InterpretationCard title="Lectura técnica" body={personInterpretation.technical} />
                        <InterpretationCard title="Lectura ministerial" body={personInterpretation.ministerial} />
                      </div>

                      <Card className="rounded-2xl">
                        <CardHeader><CardTitle className="text-base">Recomendaciones</CardTitle></CardHeader>
                        <CardContent className="space-y-2 text-sm text-slate-700">
                          {personInterpretation.recommendations.map((item, idx) => (
                            <div key={idx}>• {item}</div>
                          ))}
                        </CardContent>
                      </Card>

                      <div className="grid gap-4 xl:grid-cols-3">
                        <TopCard title="Top funcional" items={functionalReport.top3} />
                        <TopCard title="Top espiritual" items={spiritualReport.top3} />
                        <TopCard title="Dones que otros ven en mí" items={peerSummary.top.slice(0, 10)} />
                      </div>

                      <div className="grid gap-4 xl:grid-cols-2">
                        <GiftTable title="Clasificación funcional" entries={Object.entries(functionalReport.scores).sort((a, b) => b[1] - a[1])} max={20} />
                        <GiftTable title="Clasificación espiritual" entries={Object.entries(spiritualReport.scores).sort((a, b) => b[1] - a[1])} max={15} />
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </TabsContent>

              <TabsContent value="grupo" className="space-y-4">
                <Card className="rounded-3xl">
                  <CardHeader><CardTitle>Seleccionar grupo</CardTitle></CardHeader>
                  <CardContent className="flex flex-col gap-3 md:flex-row md:items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Grupo</Label>
                      <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar grupo" /></SelectTrigger>
                        <SelectContent>
                          {state.groups.map((group) => (
                            <SelectItem key={group.id} value={String(group.id)}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="outline"
                      disabled={!selectedGroup || !groupReport || !groupInterpretation}
                      onClick={() => {
                        if (!selectedGroup || !groupReport || !groupInterpretation) return
                        exportGroupReportPdf({
                          fileName: `Reporte_Grupo_${selectedGroup.name.replace(/\s+/g, "_")}.pdf`,
                          generatedAt: new Date().toLocaleString(),
                          groupName: selectedGroup.name,
                          members: groupReport.members.length,
                          completeMembers: groupReport.completeMembers.length,
                          top22: groupReport.top22,
                          confirmations: groupReport.topConfirmations,
                          functionalAgg: Object.entries(groupReport.functionalAgg).sort((a, b) => b[1] - a[1]),
                          spiritualAgg: Object.entries(groupReport.spiritualAgg).sort((a, b) => b[1] - a[1]),
                          interpretation: groupInterpretation,
                        })
                        flashSaved("PDF grupal generado correctamente")
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Exportar PDF
                    </Button>
                  </CardContent>
                </Card>

                {selectedGroup && groupReport && groupInterpretation ? (
                  <Card className="rounded-3xl">
                    <CardHeader>
                      <CardTitle>Reporte de grupo · {selectedGroup.name}</CardTitle>
                      <CardDescription>
                        {groupReport.members.length} miembros · {groupReport.completeMembers.length} completos
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-6">
                        <Metric label="Miembros" value={groupReport.members.length} />
                        <Metric label="Completos" value={groupReport.completeMembers.length} />
                        <Metric label="Top 1" value={groupReport.top22[0]?.name || "-"} />
                        <Metric label="Top 2" value={groupReport.top22[1]?.name || "-"} />
                        <Metric label="Top 3" value={groupReport.top22[2]?.name || "-"} />
                        <Metric label="Confirmaciones" value={groupReport.topConfirmations[0]?.name || "-"} />
                      </div>

                      <div className="grid gap-4 xl:grid-cols-2">
                        <InterpretationCard title="Lectura técnica" body={groupInterpretation.technical} />
                        <InterpretationCard title="Lectura ministerial" body={groupInterpretation.ministerial} />
                      </div>

                      <Card className="rounded-2xl">
                        <CardHeader><CardTitle className="text-base">Recomendaciones</CardTitle></CardHeader>
                        <CardContent className="space-y-2 text-sm text-slate-700">
                          {groupInterpretation.recommendations.map((item, idx) => (
                            <div key={idx}>• {item}</div>
                          ))}
                        </CardContent>
                      </Card>

                      <div className="grid gap-4 xl:grid-cols-3">
                        <GiftTable title="Top funcional del grupo" entries={Object.entries(groupReport.functionalAgg).sort((a, b) => b[1] - a[1]).slice(0, 12)} max={Math.max(...Object.values(groupReport.functionalAgg), 1)} />
                        <GiftTable title="Top espiritual del grupo" entries={Object.entries(groupReport.spiritualAgg).sort((a, b) => b[1] - a[1]).slice(0, 10)} max={Math.max(...Object.values(groupReport.spiritualAgg), 1)} />
                        <GiftTable title="Top 22 del grupo" entries={groupReport.top22.map((x) => [x.name, x.score])} max={groupReport.top22[0]?.score || 1} />
                      </div>

                      <GiftTable title="Dones más confirmados por terceros" entries={groupReport.topConfirmations.map((x) => [x.name, x.score])} max={groupReport.topConfirmations[0]?.score || 1} />
                    </CardContent>
                  </Card>
                ) : null}
              </TabsContent>

              <TabsContent value="don" className="space-y-4">
                <Card className="rounded-3xl">
                  <CardHeader><CardTitle>Seleccionar don dentro del grupo</CardTitle></CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Grupo</Label>
                      <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar grupo" /></SelectTrigger>
                        <SelectContent>
                          {state.groups.map((group) => (
                            <SelectItem key={group.id} value={String(group.id)}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Don</Label>
                      <Select value={selectedGift} onValueChange={setSelectedGift}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar don" /></SelectTrigger>
                        <SelectContent>
                          {ALL_GIFTS.map((gift) => (
                            <SelectItem key={gift} value={gift}>
                              {gift}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button
                        className="w-full"
                        variant="outline"
                        disabled={!selectedGroup || !giftReport || !giftInterpretation}
                        onClick={() => {
                          if (!selectedGroup || !giftReport || !giftInterpretation) return
                          exportGiftInGroupPdf({
                            fileName: `Reporte_Don_${selectedGift.replace(/\s+/g, "_")}_${selectedGroup.name.replace(/\s+/g, "_")}.pdf`,
                            generatedAt: new Date().toLocaleString(),
                            groupName: selectedGroup.name,
                            gift: giftReport.gift,
                            totalScore: giftReport.totalScore,
                            totalConfirmations: giftReport.totalConfirmations,
                            avgCompletion: giftReport.avgCompletion,
                            rows: giftReport.rows.map((r) => ({
                              full_name: r.member.full_name,
                              id: r.member.id,
                              score: r.score,
                              confirmations: r.confirmations,
                              completion: r.completion,
                              semaphore: r.semaphore,
                            })),
                            interpretation: giftInterpretation,
                          })
                          flashSaved("PDF por don generado correctamente")
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Exportar PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {giftReport && giftInterpretation ? (
                  <Card className="rounded-3xl">
                    <CardHeader>
                      <CardTitle>Reporte por don · {giftReport.gift}</CardTitle>
                      <CardDescription>Grupo: {selectedGroup?.name}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid gap-3 md:grid-cols-3">
                        <Metric label="Puntaje total del don" value={giftReport.totalScore} />
                        <Metric label="Confirmaciones del don" value={giftReport.totalConfirmations} />
                        <Metric label="Promedio completado" value={`${Math.round(giftReport.avgCompletion)}%`} percent={giftReport.avgCompletion} />
                      </div>

                      <div className="grid gap-4 xl:grid-cols-2">
                        <InterpretationCard title="Lectura técnica" body={giftInterpretation.technical} />
                        <InterpretationCard title="Lectura ministerial" body={giftInterpretation.ministerial} />
                      </div>

                      <Card className="rounded-2xl">
                        <CardHeader><CardTitle className="text-base">Recomendaciones</CardTitle></CardHeader>
                        <CardContent className="space-y-2 text-sm text-slate-700">
                          {giftInterpretation.recommendations.map((item, idx) => (
                            <div key={idx}>• {item}</div>
                          ))}
                        </CardContent>
                      </Card>

                      <Card className="rounded-2xl">
                        <CardHeader><CardTitle className="text-base">Miembros del grupo para este don</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                          {giftReport.rows.map((row) => (
                            <div key={row.member.id} className="grid gap-3 rounded-2xl border p-4 md:grid-cols-6">
                              <div className="md:col-span-2">
                                <div className="font-semibold">{row.member.full_name}</div>
                                <div className="text-sm text-slate-500">ID {row.member.id}</div>
                              </div>
                              <Metric label="Puntaje" value={row.score} percent={(row.score / (FUNCTIONAL_GIFTS.includes(giftReport.gift as never) ? 20 : 15)) * 100} />
                              <Metric label="Confirmaciones" value={row.confirmations} />
                              <Metric label="Completado" value={`${Math.round(row.completion)}%`} percent={row.completion} />
                              <Metric label="Semáforo" value={row.semaphore} percent={row.completion} />
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </CardContent>
                  </Card>
                ) : null}
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}