import { App } from '@slack/bolt'
import help from './help'
import hey from './hey'
import heyhey from './heyhey'
import log from './log'

export default function (app: App) {
  help(app)
  hey(app)
  heyhey(app)
  log(app)
}
