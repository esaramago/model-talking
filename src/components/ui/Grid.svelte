<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { Spacing, Break, Justify, Align, Direction } from '@/types/grid'

  let {
    tag = 'div',
    direction,
    align,
    justify,
    gap,
    wrap,
    fullWidth = false,
    class: className,
    break: breakProp,
    children
  }: {
    tag?: keyof HTMLElementTagNameMap
    direction?: Direction
    align?: Align
    justify?: Justify
    gap?: Spacing
    wrap?: boolean
    fullWidth?: boolean
    class?: string
    break?: Break
    children?: Snippet
  } = $props()

  const gridStyle = $derived(
    [
      gap ? `--gap: var(--wa-space-${gap})` : '',
      align ? `--align: ${align}` : '',
      justify ? `--justify: ${justify}` : '',
      wrap !== undefined ? `--wrap: ${wrap ? 'wrap' : 'nowrap'}` : '',
      direction ? `--direction: ${direction}` : ''
    ]
      .filter(Boolean)
      .join(';')
  )
</script>

<svelte:element
  this={tag}
  class="l-grid {breakProp ? `break--${breakProp}` : ''} {className || ''}"
  class:l-grid--full-width={fullWidth}
  style={gridStyle || undefined}
>
  {@render children?.()}
</svelte:element>

<style>
  .l-grid {
    --gap: var(--wa-space-m);
    --align: initial;
    --justify: initial;
    --wrap: initial;
    --direction: initial;
    display: flex;
    flex-direction: var(--direction);
    gap: var(--gap);
    align-items: var(--align);
    justify-content: var(--justify);
    flex-wrap: var(--wrap);
  }

  .l-grid--full-width > :global(*) {
    width: 100%;
    flex: 1;
  }

  @media (max-width: 767px) {
    .break--mobile {
      flex-direction: column;
      flex-wrap: wrap;
    }
  }

  @media (max-width: 1023px) {
    .break--small {
      flex-direction: column;
      flex-wrap: wrap;
    }
  }

  :global(.l-grid > [data-grow='1']) {
    flex-grow: 1;
  }
</style>
