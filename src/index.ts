import { App } from '@slack/bolt'
import { config } from 'dotenv'
import ping from './ping'

config()

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
})

;(async () => {
  ping(app)

  const port = process.env.PORT || 3000
  await app.start(port)

  console.log('⚡️condition-report is running!')
})()
