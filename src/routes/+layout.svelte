<script lang="ts">
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
  import Header from '@/components/ui/Header.svelte'
  import Sidebar from '@/components/ui/Sidebar.svelte'
  import { talksState } from '@/lib/state/talks.svelte'
  import { currentUser } from '@/lib/pocketbase'
  import { i18n } from '@/lib/i18n/index.svelte'
  import { loadSettings } from '@/lib/storage'
  import type { LayoutData } from './$types'
  import type { Snippet } from 'svelte'
  import { onMount } from 'svelte'

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

  let lastUserId = $state<string | null | undefined>(undefined)

  $effect(() => {
    const currentUserId = data.user?.id ?? null
    if (lastUserId === undefined) {
      lastUserId = currentUserId
    } else if (lastUserId !== currentUserId) {
      lastUserId = currentUserId
      const loaded = loadSettings(currentUserId, data.user?.settings)
      i18n.setLanguage(loaded.language)
    }
  })

  onMount(() => {
    const loaded = loadSettings(data.user?.id, data.user?.settings)
    i18n.setLanguage(loaded.language)
    talksState.subscribe()
    return () => {
      talksState.unsubscribe()
    }
  })
</script>

<div class="wrapper">
  <Sidebar />
  <main>
    <div class="container l-container">
      <Header />
      <div class="content">
        {@render children?.()}
      </div>
    </div>
  </main>
</div>

<style>
.wrapper {
  height: 100vh;
  @media (min-width: 961px) {
    display: grid;
    grid-template-columns: 28rem 1fr;
  }
}
.container {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-block-end: var(--wa-space-l);
}
</style>