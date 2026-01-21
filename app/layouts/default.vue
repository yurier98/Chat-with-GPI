<template>
  <div class="flex h-screen overflow-hidden">
    <SideBar class="w-80 border-r border-muted dark:bg-default h-full overflow-y-auto" />
    <div class="flex-1 flex flex-col h-full">
      <slot />
    </div>
  </div>
</template>
