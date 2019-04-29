const PersistStore = require('electron-store')
const persist = new PersistStore()

const get = (path, obj = persist.get('main')) => {
  path.split('.').some((key, i) => {
    if (typeof obj !== 'object') { obj = undefined } else { obj = obj[key] }
    return obj === undefined // Stop navigating the path if we get to undefined value
  })
  return obj
}

const main = (path, def) => {
  let found = get(path)
  if (found === undefined) return def
  return found
}

let initial = {
  panel: {
    show: false,
    view: 'default'
  },
  view: { current: '', list: [], data: {}, notify: '', badge: '' },
  tray: {
    open: false,
    initial: true
  },
  frame: {
    type: 'tray'
  },
  external: {
    rates: {}
  },
  main: {
    launch: main('launch', false),
  }
}

module.exports = () => initial
