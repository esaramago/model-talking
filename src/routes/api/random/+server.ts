import { json, type RequestHandler } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'
import {
  DAILY_MESSAGE_LIMIT,
  MODEL,
  RANDOM_SCENARIO_SYSTEM_PROMPT,
  type ScenarioTheme
} from '@/lib/config'
import { consumeQuota, getQuota, resolveRateLimitIdentifier } from '@/lib/server/rateLimit'

interface RandomRequestBody {
  language?: string
  theme?: ScenarioTheme
}

function resolveLanguageName(code?: string): string {
  if (!code) return 'European Portuguese (Português de Portugal)'
  const norm = code.trim().toLowerCase()
  switch (norm) {
    case 'pt-pt':
    case 'pt':
      return 'European Portuguese (Português de Portugal)'
    case 'en':
    case 'en-us':
    case 'en-gb':
      return 'English'
    case 'es':
      return 'Spanish (Español)'
    case 'fr':
      return 'French (Français)'
    case 'de':
      return 'German (Deutsch)'
    case 'it':
      return 'Italian (Italiano)'
    case 'tr':
      return 'Turkish (Türkçe)'
    case 'ru':
      return 'Russian (Русский)'
    case 'ar':
      return 'Arabic (العربية)'
    default:
      return code
  }
}

interface ParsedScenario {
  agent1Name: string
  agent2Name: string
  systemPrompt1: string
  systemPrompt2: string
  initialTopic: string
}

function parseScenarioContent(raw: string): ParsedScenario {
  let clean = raw.replace(/```(?:json)?/gi, '').trim()
  const firstBrace = clean.indexOf('{')
  const lastBrace = clean.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1) {
    clean = clean.slice(firstBrace, lastBrace + 1)
  }
  // Remove trailing commas before closing braces
  clean = clean.replace(/,\s*([}\]])/g, '$1')

  let parsed: any = null
  try {
    parsed = JSON.parse(clean)
  } catch {
    // If strict JSON.parse fails, attempt key-by-key regex extraction
    const fields = ['agent1Name', 'agent2Name', 'systemPrompt1', 'systemPrompt2', 'initialTopic']
    const extracted: Record<string, string> = {}

    for (let i = 0; i < fields.length; i++) {
      const name = fields[i]
      const nextName = fields[i + 1]
      const pattern = nextName
        ? new RegExp(`"${name}"\\s*:\\s*"([\\s\\S]*?)"\\s*,\\s*"${nextName}"`)
        : new RegExp(`"${name}"\\s*:\\s*"([\\s\\S]*?)"\\s*}`)
      const match = clean.match(pattern)
      if (match && match[1]) {
        extracted[name] = match[1].replace(/\\"/g, '"').trim()
      }
    }

    if (extracted.agent1Name || extracted.initialTopic) {
      parsed = extracted
    }
  }

  // Support alternative key aliases if model used them
  const agent1Name =
    typeof parsed?.agent1Name === 'string'
      ? parsed.agent1Name
      : typeof parsed?.agent_1_name === 'string'
        ? parsed.agent_1_name
        : typeof parsed?.character1Name === 'string'
          ? parsed.character1Name
          : ''

  const agent2Name =
    typeof parsed?.agent2Name === 'string'
      ? parsed.agent2Name
      : typeof parsed?.agent_2_name === 'string'
        ? parsed.agent_2_name
        : typeof parsed?.character2Name === 'string'
          ? parsed.character2Name
          : ''

  const systemPrompt1 =
    typeof parsed?.systemPrompt1 === 'string'
      ? parsed.systemPrompt1
      : typeof parsed?.system_prompt_1 === 'string'
        ? parsed.system_prompt_1
        : typeof parsed?.character1Prompt === 'string'
          ? parsed.character1Prompt
          : ''

  const systemPrompt2 =
    typeof parsed?.systemPrompt2 === 'string'
      ? parsed.systemPrompt2
      : typeof parsed?.system_prompt_2 === 'string'
        ? parsed.system_prompt_2
        : typeof parsed?.character2Prompt === 'string'
          ? parsed.character2Prompt
          : ''

  const initialTopic =
    typeof parsed?.initialTopic === 'string'
      ? parsed.initialTopic
      : typeof parsed?.initial_topic === 'string'
        ? parsed.initial_topic
        : typeof parsed?.firstMessage === 'string'
          ? parsed.firstMessage
          : ''

  return {
    agent1Name: agent1Name.trim().slice(0, 30),
    agent2Name: agent2Name.trim().slice(0, 30),
    systemPrompt1: systemPrompt1.trim().slice(0, 200),
    systemPrompt2: systemPrompt2.trim().slice(0, 200),
    initialTopic: initialTopic.trim().slice(0, 200)
  }
}

export const POST: RequestHandler = async (event) => {
  const { request, locals } = event

  try {
    let language = 'pt-PT'
    let theme: ScenarioTheme | undefined
    try {
      const body = (await request.json()) as RandomRequestBody
      if (body?.language) {
        language = body.language
      }
      if (body?.theme) {
        theme = body.theme
      }
    } catch {
      // Body may be empty
    }

    const resolvedApiKey = env.OPENROUTER_API_KEY?.trim() || process.env.OPENROUTER_API_KEY?.trim()
    if (!resolvedApiKey) {
      return json(
        {
          error: 'OpenRouter API key is missing. Set OPENROUTER_API_KEY in your .env file.'
        },
        { status: 400 }
      )
    }

    const identifier = resolveRateLimitIdentifier(event)
    const initialQuota = await getQuota(locals.pb, identifier)

    if (!identifier.isAdmin && initialQuota.remaining <= 0) {
      return json(
        {
          error: `Daily credit limit reached (${DAILY_MESSAGE_LIMIT}/${DAILY_MESSAGE_LIMIT}). Your credits will reset at 00:00 UTC.`,
          quota: initialQuota
        },
        { status: 429 }
      )
    }

    const targetLanguage = resolveLanguageName(language)
    const systemPrompt = RANDOM_SCENARIO_SYSTEM_PROMPT(targetLanguage, theme)

    const requestPayload = {
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: theme ? `Generate a ${theme} scenario now.` : 'Generate a scenario now.'
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'debate_scenario',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              agent1Name: { type: 'string', description: 'Name of character 1 (max 30 characters)' },
              agent2Name: { type: 'string', description: 'Name of character 2 (max 30 characters)' },
              systemPrompt1: { type: 'string', description: 'Concise definition, role, tone, and stance for character 1 (max 200 characters)' },
              systemPrompt2: { type: 'string', description: 'Concise definition, role, tone, and stance for character 2 (max 200 characters)' },
              initialTopic: { type: 'string', description: 'The opening statement or provocative question from character 1 to start the conversation (max 200 characters)' }
            },
            required: ['agent1Name', 'agent2Name', 'systemPrompt1', 'systemPrompt2', 'initialTopic'],
            additionalProperties: false
          }
        }
      },
      max_tokens: 1500,
      temperature: 0.85,
      reasoning: { effort: 'low' }
    }

    let scenario: ParsedScenario | null = null

    // Attempt up to 2 times to guard against intermittent provider glitches
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resolvedApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:5174',
            'X-Title': 'Model Talking'
          },
          body: JSON.stringify(requestPayload)
        })

        if (!response.ok) {
          const errText = await response.text()
          console.error(`OpenRouter error during random generation (attempt ${attempt}):`, response.status, errText)
          if (attempt === 2) {
            const error =
              response.status === 429
                ? 'AI provider rate limit reached. Please try again later.'
                : 'Failed to generate random scenario from AI provider.'
            return json({ error, quota: initialQuota }, { status: response.status === 429 ? 429 : 502 })
          }
          continue
        }

        const data = await response.json()
        const choice = data.choices?.[0]
        const rawContent: string = choice?.message?.content ?? ''

        const candidate = parseScenarioContent(rawContent)
        if (candidate.agent1Name && candidate.agent2Name && candidate.initialTopic) {
          scenario = candidate
          break
        } else {
          console.warn(`Random generation attempt ${attempt} returned incomplete fields:`, rawContent)
        }
      } catch (attemptErr) {
        console.warn(`Random generation attempt ${attempt} threw an error:`, attemptErr)
      }
    }

    if (!scenario) {
      return json(
        {
          error: 'Failed to parse AI-generated scenario. Please try again.',
          quota: initialQuota
        },
        { status: 502 }
      )
    }

    // Only consume credit after a valid scenario is generated
    const quotaResult = await consumeQuota(locals.pb, identifier)

    return json({
      ...scenario,
      quota: quotaResult.quota
    })
  } catch (err: unknown) {
    console.error('Random API error:', err)
    return json({ error: 'Internal server error' }, { status: 500 })
  }
}
