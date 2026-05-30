import * as riot from 'riot'
import Bolt10Desktop from './components/bolt10-desktop.riot'

// Register main desktop component
riot.register('bolt10-desktop', Bolt10Desktop)

// Mount to standard app hook
riot.mount('#app', {}, 'bolt10-desktop')
