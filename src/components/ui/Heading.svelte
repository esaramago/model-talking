<script lang="ts">
	let { title, subtitle } = $props()
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
  margin-block-end: var(--wa-space-3xl);
}
p {
  font-size: var(--wa-font-size-l);
}
</style>