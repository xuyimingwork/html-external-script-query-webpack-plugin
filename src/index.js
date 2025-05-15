// @ts-check
'use strict';
const parse5 = require('parse5');
const URL = require('whatwg-url').URL
const debug = require('debug')('html-external-script-query-webpack-plugin')

const WEBPACK_PLUGIN_NAME = 'HtmlExternalScriptQueryWebpackPlugin'

const plugin = class {
  constructor(options) {
    const TIMESTAMP_INSTANTIATION = new Date().getTime()
    const userOptions = options || {}
    const defaultOptions = {
      debug: false,
      queryCreator: ({ src }) => ({ _t: TIMESTAMP_INSTANTIATION })
    }
    this.options = Object.assign(defaultOptions, userOptions)
    debug.enabled = !!this.options.debug
    debug('init')
  }

  apply(compiler) {
    debug('apply')
    const HtmlWebpackPlugin = getHtmlWebpackPlugin(compiler)
    if (!HtmlWebpackPlugin) {
      debug('end: HtmlWebpackPlugin not found')
      return
    }

    const cb = (data, cb) => {
      debug('transform start')
      data.html = transform(data.html, { queryCreator: this.options.queryCreator })
      debug('transform done')
      cb(null, data)
    }

    if (compiler.hooks) {
      // webpack 4 & 5 support
      setupHtmlWebpackPlugin(cb, compiler, HtmlWebpackPlugin)
    } else {
      // webpack 3 support
      compiler.plugin('compilation', function (compilation) {
        compilation.plugin('html-webpack-plugin-after-html-processing', cb);
      });
    }
  }
}

function patch(src, patch) {
  if (!patch || !Object.keys(patch).length) return ''
  const url = new URL(src, 'https://placeholder.local')
  if (!url) return ''
  const searchParams = url.searchParams
  const query = Object.entries(patch)
    .filter(([key]) => searchParams ? !searchParams.has(key) : true)
    .map(([key, value]) => value ? `${key}=${value}` : key).join('&')
  if (!url.searchParams?.size) return `?${query}`
  return query ? `&${query}` : ''
}

function traverse(node, cb) {
  if (!node) return
  if (typeof cb !== 'function') return
  cb(node)
  if (!Array.isArray(node.childNodes)) return
  node.childNodes.forEach(node => traverse(node, cb))
}

function transform(html, { queryCreator }) {
  if (typeof queryCreator !== 'function') return html
  debug('transform parse')
  const document = parse5.parse(html)
  let count = 0
  traverse(document, node => {
    // 不是 script 标签
    if (node.tagName !== 'script') return
    // script 标签内存在内容
    if (Array.isArray(node.childNodes) && node.childNodes.length && node.childNodes.some(item => item.nodeName === '#text')) return
    // script 标签无 src
    const attr = node.attrs.find(attr => attr.name === 'src' && !!attr.value)
    if (!attr) return
    const query = queryCreator({ src: attr.value })
    const patchQuery = patch(attr.value, query)
    if (patchQuery) {
      count++
      debug('transform script %o patch %o', attr.value, patchQuery)
    }
    attr.value += patchQuery
  })
  debug('transform script count %o', count)
  debug('transform serialize')
  return parse5.serialize(document)
}

function setupHtmlWebpackPlugin(cb, compiler, HtmlWebpackPlugin) {
  if (typeof cb !== 'function') return
  compiler.hooks.compilation.tap(WEBPACK_PLUGIN_NAME, (compilation) => {
    const getCompilationHooks = HtmlWebpackPlugin.getCompilationHooks || HtmlWebpackPlugin.getHooks
    if (getCompilationHooks) {
      // HtmlWebpackPlugin 4 & 5
      const hook = getCompilationHooks(compilation).beforeEmit
      if (!hook || typeof hook.tapAsync !== 'function') return
      hook.tapAsync(WEBPACK_PLUGIN_NAME, cb)
    } else if (compilation.hooks.htmlWebpackPluginAfterHtmlProcessing) {
      // HtmlWebpackPlugin 3.x
      compilation.hooks.htmlWebpackPluginAfterHtmlProcessing.tapAsync(WEBPACK_PLUGIN_NAME, cb) 
    }
  })
}

function getHtmlWebpackPlugin(compiler) {
  if (!compiler || !compiler.options || !Array.isArray(compiler.options.plugins)) return
  const plugins = compiler.options.plugins
  const [HtmlWebpackPluginInstance] = plugins.filter((plugin) => plugin.constructor.name === 'HtmlWebpackPlugin');
  if (!HtmlWebpackPluginInstance) return
  return HtmlWebpackPluginInstance.constructor
}

module.exports = plugin;