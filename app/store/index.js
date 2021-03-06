/* globals fetch */

import EventEmitter from 'events'
import Restore from 'react-restore'
import utils from 'web3-utils'

import link from '../link'
import * as actions from './actions'

export default (state, cb) => {
  const store = Restore.create(state, actions)
  store.events = new EventEmitter()

  // Feed for relaying state updates
  store.api.feed((state, actions, obscount) => {
    actions.forEach(action => {
      action.updates.forEach(update => {
        if (update.path.startsWith('main')) return
        link.send('tray:syncPath', update.path, update.value)
      })
    })
  })

  link.rpc('getSigners', (err, signers) => {
    if (err) return store.signersError(err)
    store.updateSigners(signers)
  })

  link.on('action', (action, ...args) => { if (store[action]) store[action](...args) })
  link.send('tray:ready') // turn on api

  const etherRates = () => {
    fetch('https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD').then(res => res.json()).then(res => {
      if (res) store.updateExternalRates(res)
    }).catch(e => console.log('Unable to fetch exchange rate', e))
  }
  etherRates()
  setInterval(etherRates, 10000)

  link.send('tray:refreshMain')

  let monitor

  const refreshBalances = () => {
    monitor.forEach(account => {
      link.rpc('providerSend', { 'jsonrpc': '2.0', 'method': 'eth_getBalance', 'params': [account, 'latest'], 'id': 1 }, res => {
        if (res.error) return
        let balance = utils.fromWei(utils.hexToNumberString(res.result))
        if (store('balances', account) !== balance) store.setBalance(account, balance)
      })
    })
  }

  store.observer(() => {
    monitor = []
    Object.keys(store('signers')).forEach(id => {
      if (store('signer.current') === id && store('signer.showAccounts')) { // When viewing accounts, refresh them all
        let accounts = store('signers', id, 'accounts')
        if (accounts.length) monitor = monitor.concat(accounts)
      } else { // Monitor index accounts of each signer
        let account = store('signers', id, 'accounts', store('signers', id, 'index'))
        if (account) monitor.push(account)
      }
    })
    refreshBalances()
  })

  setInterval(refreshBalances, 15 * 1000)

  return store
}
