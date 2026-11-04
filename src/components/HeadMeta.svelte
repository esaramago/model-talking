<script lang="ts">
  import { page } from '$app/state'
  import { env } from '$env/dynamic/public'
  import { PUBLIC_WEBSITE_TITLE } from '@/lib/config'

  interface Props {
    title?: string
    description?: string
    image?: string
    canonicalUrl?: string
    type?: 'website' | 'article'
    locale?: string
  }

  let {
    title,
    description = '',
    image = '/img/og-image.png',
    canonicalUrl,
    type = 'website',
    locale = 'en'
  }: Props = $props()

  const siteName = PUBLIC_WEBSITE_TITLE || 'Model Talking'
  const fullTitle = $derived(
    title ? (title === siteName ? title : `${title} · ${siteName}`) : siteName
  )

  const baseOrigin = $derived(
    (env.PUBLIC_BASE_URL || env.PUBLIC_CANONICAL_ORIGIN || page.url.origin).replace(/\/$/, '')
  )
  const resolvedCanonical = $derived(
    canonicalUrl || `${baseOrigin}${page.url.pathname}`
  )
</script>

<svelte:head>
  <title>{fullTitle}</title>

  {#if description}
    <meta name="description" content={description} />
  {/if}

  {#if resolvedCanonical}
    <link rel="canonical" href={resolvedCanonical} />
  {/if}

  <!-- Open Graph -->
  <meta property="og:type" content={type} />
  <meta property="og:site_name" content={siteName} />
  <meta property="og:title" content={fullTitle} />

  {#if description}
    <meta property="og:description" content={description} />
  {/if}

  {#if resolvedCanonical}
    <meta property="og:url" content={resolvedCanonical} />
  {/if}

  {#if image}
    <meta property="og:image" content={image} />
    <meta property="og:image:alt" content={fullTitle} />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
  {/if}

  {#if locale}
    <meta property="og:locale" content={locale} />
  {/if}
</svelte:head>
