<script lang="ts">
	let {
    title,
    subtitle
  }: {
    title: string
    subtitle?: string
  } = $props()
</script>

<div class="heading">
  <h1>{title}</h1>
  {#if subtitle}
    <p>{@html subtitle}</p>
  {/if}
</div>

<style>
.heading {
  display: flex;
  flex-direction: column;
  gap: var(--wa-space-xs);
  text-align: center;
}
p {
  font-size: clamp(var(--wa-font-size-s), 3vw, var(--wa-font-size-l));
}
</style>