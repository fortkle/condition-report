/// <reference types="node" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly SLACK_SIGNING_SECRET: string
    readonly SLACK_BOT_TOKEN: string
    readonly DEFAULT_REPORT_CHANNEL: string
    readonly BACKUP_POST_CHANNEL: string
    readonly SKIP_MEMBERS: string
    readonly ADMIN_MEMBERS: string
    readonly ADMIN_DISPLAY_NAME: string
    readonly REMIND_MESSAGE: string
  }
}
