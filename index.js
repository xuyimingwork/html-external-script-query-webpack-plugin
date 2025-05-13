// @ts-check
'use strict';

const parse5 = require('parse5');
const URL = require('whatwg-url').URL

const WEBPACK_PLUGIN_NAME = 'HtmlExternalScriptQueryWebpackPlugin'

const plugin = class {
  constructor(options) {
    const userOptions = options || {}
    const defaultOptions = {
      queryCreator: ({ src }) => ({ _t: new Date().getTime() })
    }
    this.options = Object.assign(defaultOptions, userOptions)
  }

  apply(compiler) {
    getHtmlWebpackPluginBeforeEmitHook(compiler)
      .then(hook => {
        tapAsyncOnHook(hook, (data, cb) => {
          const document = parse5.parse(data.html)
          traverse(document, node => {
            // 不是 script 标签
            if (node.tagName !== 'script') return
            // script 标签内存在内容
            if (Array.isArray(node.childNodes) && node.childNodes.length && node.childNodes.some(item => item.nodeName === '#text')) return
            // script 标签无 src
            const attr = node.attrs.find(attr => attr.name === 'src' && !!attr.value)
            if (!attr) return
            const queryCreator = this.options.queryCreator
            if (typeof queryCreator !== 'function') return
            const query = queryCreator({ src: attr.value })
            attr.value += patch(attr.value, query)
          })
          data.html = parse5.serialize(document)
          cb(null, data);
        })
      })
  }
}

function patch(src, patch) {
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

function tapAsyncOnHook(hook, cb) {
  if (!hook || typeof hook.tapAsync !== 'function') return
  if (typeof cb !== 'function') return
  hook.tapAsync(WEBPACK_PLUGIN_NAME, cb)
}

function getHtmlWebpackPluginBeforeEmitHook(compiler) {
  const HtmlWebpackPlugin = getHtmlWebpackPlugin(compiler)
  if (!HtmlWebpackPlugin) return Promise.resolve()
  // html-webpack-plugin v5 / v4
  const getCompilationHooks = HtmlWebpackPlugin.getCompilationHooks || HtmlWebpackPlugin.getHooks
  if (typeof getCompilationHooks !== 'function') return Promise.resolve()
  return new Promise((resolve) => {
    compiler.hooks.compilation.tap(WEBPACK_PLUGIN_NAME, (compilation) => {
      const hook = getCompilationHooks(compilation).beforeEmit
      return resolve(hook)
    })
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