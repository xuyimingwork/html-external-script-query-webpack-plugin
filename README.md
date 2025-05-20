# html-external-script-query-webpack-plugin

add query to webpack html external script's src, means auto change

```html
<script src="https://cdn.jsdelivr.net/npm/jquery@3/dist/jquery.min.js"></script>
```

to 

```html
<script src="https://cdn.jsdelivr.net/npm/jquery@3/dist/jquery.min.js?_t=1747118972970"></script>
```

- Also change matched preload link's href
- Only worked in html-webpack-plugin's template
- Support webpack 3 & 4 & 5 and HtmlWebpackPlugin 3 & 4 & 5

## install

```bash
npm i --save-dev html-external-script-query-webpack-plugin
```

## usage

**webpack.config.js**

```js
const HtmlExternalScriptQueryWebpackPlugin = require("html-external-script-query-webpack-plugin");

module.exports = {
  plugins: [
    new HtmlExternalScriptQueryWebpackPlugin()
  ],
};
```

this will add ?_t=timestamp to every external script's src in HtmlWebpackPlugin's html

### custom query

You can add custom query like version like this

**webpack.config.js**

```js
const HtmlExternalScriptQueryWebpackPlugin = require("html-external-script-query-webpack-plugin");

module.exports = {
  plugins: [
    new HtmlExternalScriptQueryWebpackPlugin({ queryCreator: ({ src }) => ({ version: 'v1' }) })
  ],
};
```

this will change

```html
<script src="https://cdn.jsdelivr.net/npm/jquery@3/dist/jquery.min.js"></script>
```

to 

```html
<script src="https://cdn.jsdelivr.net/npm/jquery@3/dist/jquery.min.js?version=v1"></script>
```