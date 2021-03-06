import pug, { IHyperPugFilters } from 'hyperpug'
import showdown, { ShowdownExtension } from 'showdown'
import h from 'hyperscript'
import matter from 'gray-matter'
import scopeCss from 'scope-css'
import qs from 'querystring'
import stringify from 'es6-json-stable-stringify'
import './reveal-md.scss'

const currentSlide = location.hash

declare global {
  interface Window {
    Reveal: RevealStatic
    hljs: any
    revealMd: RevealMd
    revealPlugins: {
      markdown: {
        [name: string]: ShowdownExtension
      }
      pug: IHyperPugFilters
    }
  }
}

window.revealPlugins = {
  markdown: {},
  pug: {},
}

export interface ISlide {
  id: string
  type: 'hidden' | 'global' | 'regular'
  html: string
  comment: {
    [key: string]: string[]
  }
  raw: string
}

let revealCdn = 'https://cdn.jsdelivr.net/npm/reveal.js@3.8.0/'
const mdConverter = new showdown.Converter()
mdConverter.setFlavor('github')

async function main () {
  const { data, content } = matter(process.env.VUE_APP_PLACEHOLDER || '')

  let defaults = {
    headers: data,
    markdown: content,
  }

  try {
    const r = await fetch('/reveal/js/reveal.js', {
      method: 'HEAD',
    })
    if (r.status !== 200) {
      throw new Error()
    }

    revealCdn = '/reveal/'
    document.body.appendChild(Object.assign(document.createElement('script'), {
      src: `${revealCdn}js/reveal.js`,
    }))
  } catch (e) {
    document.body.appendChild(Object.assign(document.createElement('script'), {
      src: `${revealCdn}js/reveal.min.js`,
    }))
  }

  document.head.appendChild(Object.assign(document.createElement('link'), {
    rel: 'stylesheet',
    href: `${revealCdn}css/reveal.css`,
    type: 'text/css',
  }))

  document.head.appendChild(Object.assign(document.createElement('link'), {
    rel: 'stylesheet',
    href: `${revealCdn}css/theme/white.css`,
    type: 'text/css',
    id: 'reveal-theme',
  }))

  const url = new URL(location.href)
  const filename = url.searchParams.get('filename')
  if (filename) {
    const config = await fetch('/api/').then((r) => r.json())

    const { data, content } = matter(await fetch(`/api/data?${qs.stringify({
      filename,
    })}`).then((r) => r.text()))
    defaults = {
      headers: {
        ...data,
        ...(config.reveal || {}),
      },
      markdown: content,
    }

    const { css, js } = data

    if (Array.isArray(js)) {
      js.forEach((j: string) => {
        document.body.appendChild(Object.assign(document.createElement('script'), {
          src: parseUrl(j),
        }))
      })
    } else if (typeof js === 'string') {
      document.body.appendChild(Object.assign(document.createElement('script'), {
        src: parseUrl(js),
      }))
    }

    if (Array.isArray(css)) {
      css.forEach((cs: string) => {
        document.head.appendChild(Object.assign(document.createElement('link'), {
          rel: 'stylesheet',
          href: parseUrl(cs),
          type: 'text/css',
        }))
      })
    } else if (typeof css === 'string') {
      document.head.appendChild(Object.assign(document.createElement('link'), {
        rel: 'stylesheet',
        href: parseUrl(css),
        type: 'text/css',
      }))
    }
  }

  setTimeout(() => {
    if (document.readyState === 'complete') {
      new RevealMd(defaults)
    } else {
      document.onreadystatechange = () => {
        if (document.readyState === 'complete') {
          new RevealMd(defaults)
        }
      }
    }
  }, 100)
}

export default class RevealMd {
  _headers: RevealOptions | null = null
  _markdown: string = ''

  queue: Array<(r?: RevealStatic) => void> = []
  raw: ISlide[][] = [[]]

  defaults = {
    reveal: {
      slideNumber: true,
      hash: true,
    },
  }

  get headers (): RevealOptions & {
    theme?: string
    title?: string
    } {
    return this._headers || this.defaults.reveal
  }

  set headers (h) {
    let { theme, title, ...subH } = h

    this.theme = theme || 'white'
    this.title = title || ''

    subH = Object.assign(JSON.parse(JSON.stringify(this.defaults.reveal)), subH)

    if (stringify(this._headers) === stringify(subH)) {
      return
    }

    this.onReady((reveal) => {
      if (reveal) {
        reveal.configure(subH)
        reveal.slide(-1, -1, -1)
        reveal.sync()
      }
    })

    this._headers = subH
  }

  get markdown () {
    return this._markdown
  }

  set markdown (s: string) {
    const globalEl = document.getElementById('global') as HTMLDivElement
    Array.from(globalEl.querySelectorAll('style.ref')).map((el) => el.remove())

    let xOffset = 0
    const newRaw = s.split(/\r?\n===\r?\n/g).map((el, x) => {
      this.raw[x] = this.raw[x] || []
      const newRawSs = el.split(/\r?\n--\r?\n/g).map((ss) => this.parseSlide(ss))
      if (newRawSs.every((ss) => !ss.html)) {
        xOffset++
      }

      x -= xOffset

      let yOffset = 0
      return newRawSs.map((thisRaw, y) => {
        if (!thisRaw.html) {
          yOffset++
          return
        }

        y -= yOffset

        let section = this.getSlide(x)
        let subSection = this.getSlide(x, y)

        if (!this.raw[x][y] || (this.raw[x][y] && this.raw[x][y].raw !== thisRaw.raw)) {
          const container = document.createElement('div')
          container.className = 'container'
          container.innerHTML = thisRaw.html

          if (section && subSection) {
            const oldContainers = subSection.getElementsByClassName('container')
            Array.from(oldContainers).forEach((el) => el.remove())
            subSection.appendChild(container)
          } else {
            subSection = document.createElement('section')
            subSection.append(container)

            if (section) {
              section.appendChild(subSection)
            } else {
              section = document.createElement('section')
              section.appendChild(subSection)
              document.querySelector('.reveal .slides')!.appendChild(section)
            }
          }

          Array.from(container.querySelectorAll('pre code:not(.hljs)')).forEach((el) => {
            if (window.hljs) {
              window.hljs.highlightBlock(el)
            }
          })
        }

        return thisRaw
      }).filter((el) => el)
    }).filter((el) => el && el.length > 0) as ISlide[][]

    this.raw.map((el, x) => {
      el.map((ss, j) => {
        const y = el.length - j - 1

        if (!newRaw[x] || !newRaw[x][y]) {
          const subSection = this.getSlide(x, y)
          if (subSection) {
            subSection.remove()
          }
        }
      })

      if (!newRaw[x]) {
        const section = this.getSlide(x)
        if (section) {
          section.remove()
        }
      }
    })

    this.raw = newRaw
  }

  get title () {
    const el = document.getElementsByTagName('title')[0]
    return el ? el.innerText : ''
  }

  set title (t) {
    let el = document.getElementsByTagName('title')[0]
    if (!el) {
      el = document.createElement('title')
      document.head.appendChild(el)
    }
    el.innerText = t
  }

  get theme () {
    const el = document.getElementById('reveal-theme') as HTMLLinkElement
    const m = /\/(\S+)\.css$/.exec(el.href)
    if (m) {
      return m[1]
    }

    return ''
  }

  set theme (t) {
    const el = document.getElementById('reveal-theme') as HTMLLinkElement
    el.href = `${revealCdn}css/theme/${t}.css`
  }

  constructor (defaults: any) {
    window.revealMd = this

    Object.entries(window.revealPlugins.markdown).forEach(([name, x]) => {
      mdConverter.addExtension(x, name)
    })

    this.markdown = defaults.markdown
    this.headers = defaults.headers
    this.onReady(() => {
      if (currentSlide) {
        location.hash = currentSlide
      }
    })
  }

  update (raw: string) {
    const { data, content } = matter(raw)
    this.markdown = content
    this.headers = data
  }

  mdConvert (s: string) {
    return s.trim() ? mdConverter.makeHtml(s) : ''
  }

  pugConvert (s: string) {
    return pug.compile({
      filters: {
        markdown: (ss) => {
          return this.mdConvert(ss)
        },
        ...window.revealPlugins.pug,
      },
    })(s)
  }

  onReady (fn?: (reveal?: RevealStatic) => void) {
    const reveal = window.Reveal
    if (reveal) {
      if (!(reveal as any).isReady()) {
        reveal.initialize({
          dependencies: [
            {
              src: `${revealCdn}plugin/highlight/highlight.js`,
              async: true,
            },
          ],
        })
        if (this.queue.length > 0) {
          this.queue.forEach(it => it(reveal))
          reveal.slide(-1, -1, -1)
          reveal.sync()
        }
      }

      if (fn) {
        fn(reveal)
      }
    } else {
      if (fn) {
        this.queue.push(fn)
      }

      setTimeout(() => {
        this.onReady()
        const reveal = window.Reveal
        if (reveal) {
          reveal.slide(-1, -1, -1)
          reveal.sync()
        }
      }, 1000)
    }
  }

  parseSlide (text: string): ISlide {
    const id = hash(text)
    let raw = text
    let type: 'hidden' | 'global' | 'regular' = 'regular'
    let html = text
    const comment: {
      [key: string]: string[]
    } = {}
    const lines: string[] = []

    for (const line of html.split('\n')) {
      if (line.startsWith('// ')) {
        const [k, v] = line.substr(3).split(/=(.+)/)
        comment[k] = [...(comment[k] || []), v || '']
        continue
      }

      lines.push(line)
    }

    raw = lines.join('\n')

    if (comment.hidden) {
      type = 'hidden'
      return { html: '', comment, raw, id, type }
    }

    if (comment.global) {
      type = 'global'
    }

    if (comment.css) {
      comment.css.forEach((ref, i) => {
        const globalEl = document.getElementById('global') as HTMLDivElement
        const className = `ref${i}`

        let el = globalEl.querySelector(`style.ref.${className}`)
        if (!el) {
          el = document.createElement('style')
          el.classList.add('ref', className)
          globalEl.appendChild(el)
        }

        fetch(parseUrl(ref)).then((r) => r.text()).then((content) => {
          if (type !== 'global') {
            content = scopeCss(content, `#${id}`)
          }
          el!.innerHTML = content
        })
      })
    }

    html = html.replace(/(?:^|\n)```(\S+) parsed\n([^]+?)\n```(?:$|\n)/g, (p0, lang, content) => {
      if (lang === 'css') {
        const globalEl = document.getElementById('global') as HTMLDivElement
        if (type !== 'global') {
          content = scopeCss(content, `#${id}`)
        }
        let el = globalEl.querySelector('style.main')
        if (!el) {
          el = document.createElement('style')
          el.className = 'main'
          globalEl.appendChild(el)
        }
        el.innerHTML = content
        return ''
      } else if (lang === 'pre') {
        return h('pre', content).outerHTML
      } else if (lang === 'pug') {
        return this.pugConvert(content)
      } else if (lang === 'html') {
        return content
      }

      return p0
    })

    if (type === 'global') {
      document.body.insertAdjacentHTML('beforeend', html)
      return { html: '', comment, raw, id, type }
    }

    return {
      html: h(`#${id}`, {
        innerHTML: this.mdConvert(html),
      }).outerHTML,
      comment,
      raw,
      id,
      type,
    }
  }

  getSlide (x: number, y?: number) {
    const s = document.querySelectorAll('.slides > section')
    const hSlide = s[x]

    if (typeof y === 'number') {
      if (hSlide) {
        return Array.from(hSlide.children).filter((el) => el.tagName.toLocaleUpperCase() === 'SECTION')[y]
      }

      return undefined
    }

    return hSlide
  }

  build () {
    const headers = this.headers
    const markdown = this.raw.map((ss) => {
      return ss.map((s) => {
        return [
          Object.entries(s.comment).map(([k, vs]) => {
            return vs.map((v) => {
              return v ? `// ${k}=${v}` : `// ${k}`
            }).join('\n')
          }).join('\n'),
          s.raw,
        ].join('\n')
      }).join('\n--\n')
    }).join('\n===\n')

    return matter.stringify(markdown, headers)
  }
}

function hash (str: string) {
  var hash = 0
  for (var i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  return Math.round(Math.abs(hash)).toString(36)
}

function parseUrl (s: string) {
  return /:\/\//.test(s) ? s : `/api/data?${qs.stringify({
    filename: s,
  })}`
}

main()
