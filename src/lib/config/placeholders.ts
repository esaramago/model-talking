/**
 * Live description placeholders rotated every 5 seconds in agent configuration textareas.
 * Each index represents a contrasting or complementary persona pair.
 */

export const PLACEHOLDER_INTERVAL_MS = 5000

export const AGENT_1_PLACEHOLDERS_PT = [
  'Sócrates: filósofo curioso que questiona todas as certezas.',
  'Sherlock Holmes: detetive analítico focado em pura dedução lógica.',
  'Cientista futurista: otimista quanto ao progresso tecnológico e IA.',
  'Explorador espacial: capitão veterano em busca de mundos habitáveis.',
  'Chef tradicional: purista defensor de receitas e técnicas clássicas.',
  'Arquiteto utópico: visionário de cidades verdes e sustentáveis.',
  'Viajante no tempo: observador vitoriano fascinado pelo século XXI.',
  'Historiador clássico: analista dos ciclos e lições do passado humano.',
  'Ambientalista convicto: guardião rigoroso da conservação ecológica.',
  'Economista liberal: apologista do mercado livre e da inovação privada.'
]

export const AGENT_2_PLACEHOLDERS_PT = [
  'Nietzsche: filósofo provocador que desafia convenções morais.',
  'Dr. Watson: médico empático com bom senso prático e humano.',
  'Bioeticista cauteloso: ponderador dos limites éticos da ciência.',
  'IA de bordo: sistema calculista que prioriza protocolos e segurança.',
  'Chef de vanguarda: experimentalista focado em gastronomia molecular.',
  'Engenheiro pragmático: focado em física, custos e viabilidade real.',
  'Cidadão contemporâneo: pragmático habituado ao frenesi digital.',
  'Futurista radical: convicto de que a tecnologia redefinirá o humano.',
  'Industrialista pragmático: focado em crescimento e desenvolvimento económico.',
  'Sociólogo humanista: defensor da justiça social e coesão comunitária.'
]

export const AGENT_1_PLACEHOLDERS_EN = [
  'Socrates: inquisitive philosopher questioning every certainty.',
  'Sherlock Holmes: brilliant detective focused on pure logical deduction.',
  'Futurist scientist: optimistic about technological progress and AI.',
  'Space explorer: veteran captain searching for new habitable worlds.',
  'Traditional chef: purist defender of classic culinary heritage.',
  'Utopian architect: visionary designing green, sustainable cities.',
  'Time traveler: Victorian explorer fascinated by the 21st century.',
  'Classical historian: analyst of historical cycles and human lessons.',
  'Dedicated environmentalist: rigorous guardian of ecological balance.',
  'Free-market economist: advocate of open competition and innovation.'
]

export const AGENT_2_PLACEHOLDERS_EN = [
  'Nietzsche: sharp critic of moral conventions and dogmas.',
  'Dr. Watson: empathetic doctor grounded in practical human insight.',
  'Cautious bioethicist: evaluating ethical risks and scientific boundaries.',
  'Shipboard AI: calculating system prioritizing safety and protocols.',
  'Avant-garde chef: experimentalist passionate about molecular gastronomy.',
  'Pragmatic engineer: focused on physics, concrete costs, and feasibility.',
  'Modern citizen: pragmatic realist accustomed to fast-paced digital life.',
  'Radical futurist: convinced technology will fundamentally reshape humanity.',
  'Pragmatic industrialist: focused on economic growth and energy production.',
  'Social philosopher: champion of distributive justice and community solidarity.'
]

export function getAgentPlaceholders(language?: string): {
  agent1: string[]
  agent2: string[]
} | null {
  if (!language) return null
  const normalized = language.toLowerCase()
  if (normalized.startsWith('en')) {
    return {
      agent1: AGENT_1_PLACEHOLDERS_EN,
      agent2: AGENT_2_PLACEHOLDERS_EN
    }
  }
  if (normalized.startsWith('pt')) {
    return {
      agent1: AGENT_1_PLACEHOLDERS_PT,
      agent2: AGENT_2_PLACEHOLDERS_PT
    }
  }
  return null
}
