import { AVAILABLE_PERSONAS } from '@/lib/config'

export function getPersonaImageUrl(personaId: string | number): string {
  return `/img/personas/${personaId}.svg`
}

export function getRandomPersonaPair(): [string, string] {
  const pool = [...AVAILABLE_PERSONAS]
  const idx1 = Math.floor(Math.random() * pool.length)
  const persona1 = pool.splice(idx1, 1)[0]
  const idx2 = Math.floor(Math.random() * pool.length)
  const persona2 = pool[idx2]
  return [getPersonaImageUrl(persona1), getPersonaImageUrl(persona2)]
}
