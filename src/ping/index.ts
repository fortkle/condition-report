import { App, directMention } from '@slack/bolt'

export default function (app: App) {
  app.message(directMention(), async ({ message, say }) => {
    if (typeof message.text !== 'string' || !/ping/.test(message.text)) return
    say(`<@${message.user}> pong!`)
  })
}
