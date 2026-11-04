<script lang="ts">
  import '@fontsource-variable/montserrat'
  import '@/css/main.css'
  import '@awesome.me/webawesome/dist/styles/webawesome.css'
  import '@awesome.me/webawesome/dist/components/badge/badge.js'
  import '@awesome.me/webawesome/dist/components/button/button.js'
  import '@awesome.me/webawesome/dist/components/card/card.js'
  import '@awesome.me/webawesome/dist/components/icon/icon.js'
  import '@awesome.me/webawesome/dist/components/input/input.js'
  import '@awesome.me/webawesome/dist/components/textarea/textarea.js'
  import '@awesome.me/webawesome/dist/components/select/select.js'
  import '@awesome.me/webawesome/dist/components/option/option.js'
  import '@awesome.me/webawesome/dist/components/spinner/spinner.js'
  import '@awesome.me/webawesome/dist/components/divider/divider.js'
  import '@awesome.me/webawesome/dist/components/callout/callout.js'
  import '@awesome.me/webawesome/dist/components/details/details.js'
  import '@awesome.me/webawesome/dist/components/avatar/avatar.js'
  import '@awesome.me/webawesome/dist/components/dialog/dialog.js'
  import '@awesome.me/webawesome/dist/components/slider/slider.js'
  import '@awesome.me/webawesome/dist/components/qr-code/qr-code.js'
  import Header from '@/components/ui/Header.svelte'
  import Sidebar from '@/components/ui/Sidebar.svelte'
  import Footer from '@/components/ui/Footer.svelte'
  import { talksState } from '@/lib/state/talks.svelte'
  import { stats } from '@/lib/state/stats.svelte'
  import { currentUser } from '@/lib/pocketbase'
  import { i18n } from '@/lib/i18n/index.svelte'
  import { loadSettings } from '@/lib/storage'
  import type { LayoutData } from './$types'
  import type { Snippet } from 'svelte'
  import { onMount } from 'svelte'
  import { dev } from '$app/environment'
  import { PUBLIC_UMAMI_URL, PUBLIC_UMAMI_WEBSITE_ID } from '@/lib/config'

  let { data, children }: { data: LayoutData; children?: Snippet } = $props()

  $effect(() => {
    if (data.user && data.talks) {
      talksState.setTalks(data.talks)
    } else {
      talksState.setTalks([])
    }
  })

  $effect(() => {
    currentUser.set(data.user ?? null)
  })

  $effect(() => {
    if (data.quota) {
      stats.setQuota(data.quota)
    }
  })

  let lastUserId = $state<string | null | undefined>(undefined)

  $effect(() => {
    const currentUserId = data.user?.id ?? null
    if (lastUserId === undefined) {
      lastUserId = currentUserId
    } else if (lastUserId !== currentUserId) {
      lastUserId = currentUserId
      const loaded = loadSettings(currentUserId, data.user)
      i18n.setLanguage(loaded.language)
    }
  })

  onMount(() => {
    const loaded = loadSettings(data.user?.id, data.user)
    i18n.setLanguage(loaded.language)
    talksState.subscribe()
    return () => {
      talksState.unsubscribe()
    }
  })
</script>

<svelte:head>
  {#if !dev && PUBLIC_UMAMI_URL && PUBLIC_UMAMI_WEBSITE_ID}
    <script
      defer
      src="{PUBLIC_UMAMI_URL}/script.js"
      data-website-id={PUBLIC_UMAMI_WEBSITE_ID}
    ></script>
  {/if}
</svelte:head>

<div class="wrapper">
  <Sidebar />
  <main>
    <Header />
    <div class="content l-container">
      {@render children?.()}
    </div>
    <Footer />
  </main>
</div>

<style>
.wrapper {
  @media (min-width: 961px) {
    display: grid;
    grid-template-columns: 28rem 1fr;
  }
}
.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-block-end: var(--wa-space-l);
}
</style>