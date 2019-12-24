<template lang="pug">
.h-100.w-100
  .navbar
    span.mr-3 Press F to enter fullscreen
    .ml-auto
      b-button.mr-3(variant="light" @click="showTreeview = !showTreeview") {{showTreeview ? "Show treeview" : "Hide treeview"}}
  .deck-viewer(:class="showTreeview ? 'w-50' : 'hidden'")
    treeview(v-if="dirTree" :items="dirTree.children" @filename="filename = $event")
  iframe(ref="iframe" :src="iframeUrl" frameborder="0"
  :class="showTreeview ? 'w-50' : 'w-100'")
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'
import matter from 'gray-matter'
import Treeview from '@/components/Treeview.vue'

@Component({
  components: {
    Treeview,
  },
})
export default class App extends Vue {
  showTreeview = true
  filename = ''
  dirTree: any = null

  get iframe (): HTMLIFrameElement {
    return this.$refs.iframe as HTMLIFrameElement
  }

  get iframeWindow () {
    return this.iframe.contentWindow as any
  }

  get iframeUrl () {
    if (this.filename) {
      const url = new URL(
        `${process.env.BASE_URL}/reveal-md/`,
        location.origin,
      )
      url.searchParams.set('filename', this.filename)
      return url.href
    }

    return 'about:blank'
  }

  async created () {
    try {
      const r = await fetch('/api/').then(r => r.json())
      if (r.filename) {
        this.openFile(r.filename)
      } else if (r.dirTree) {
        this.dirTree = r.dirTree
      }
    } catch (e) {}
  }

  @Watch('filename')
  openFile (filename: string) {
    this.filename = filename
    document.getElementsByTagName('title')[0].innerText = filename
      .split('/')
      .pop()!
  }
}
</script>

<style lang="scss">
$navbar-height: 60px;
html,
body,
#app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
}
.h-100 {
  height: 100%;
}
.w-100 {
  width: 100%;
}
.w-50 {
  width: 50%;
}
.hidden {
  display: none;
}
.navbar {
  display: flex;
  height: $navbar-height;
  width: 100%;
  background-color: orange;
  overflow: auto;
  white-space: nowrap;
}
iframe {
  position: fixed;
  height: calc(100vh - 60px);
  top: $navbar-height;
  &.w-50 {
    left: 50vw;
  }
}
.deck-viewer {
  height: calc(100vh - 60px) !important;
  border-right: 1px solid gray;
  padding-left: 1em;
  padding-right: 1em;
}
</style>
