import { App } from '@slack/bolt'
import { config } from 'dotenv'

config()

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
})

;(async () => {
  app.message('hello', async ({ say }) => {
    say(`hello!`)
  })

  const port = process.env.PORT || 3000
  await app.start(port)

  console.log('⚡️condition-report is running!')
})()
