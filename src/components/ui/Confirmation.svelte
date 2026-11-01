<script lang="ts">
  import Confirmation from '@/components/Confirmation.svelte'
  import type { ComponentProps } from 'svelte'

  let props: ComponentProps<typeof Confirmation> = $props()
</script>

<Confirmation {...props} />
