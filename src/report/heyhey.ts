import { App, directMention } from '@slack/bolt'
import {
  ConversationsListResult,
  ConversationsHistoryResult,
  UsersListResult,
  ConversationsMembersResult,
} from './slack_interface'
import dayjs from 'dayjs'

export default function (app: App) {
  dayjs.locale('ja')

  /**
   * アンケートに未回答の人にリマインドを送付するコマンド
   * @condition-report heyhey
   */
  app.message(directMention(), async ({ message, context, say }) => {
    if (typeof message.text !== 'string' || !/heyhey/.test(message.text)) return

    // 管理ユーザー以外は終了させる
    if (!process.env.ADMIN_MEMBERS.split(',').includes(message.user)) {
      await say('実行権限がありません')
      return
    }

    await say('リマインドの実行を準備中ですのでもう少々お待ち下さい。')

    // アンケート対象者のリストとなるチャンネルを特定
    let channel = process.env.DEFAULT_REPORT_CHANNEL
    const matches = /heyhey <#([A-Z0-9]+)\|.*>/.exec(message.text)
    if (matches) {
      channel = matches[1]
    }

    // 対象者のリストを作成
    const usersListResult = (await app.client.users.list({ token: context.botToken })) as UsersListResult
    const allMembers = usersListResult.members

    const conversationsMembersResult = (await app.client.conversations.members({
      token: context.botToken,
      channel: channel,
      limit: 1000,
    })) as ConversationsMembersResult

    const members = allMembers.filter((member) => {
      return (
        member.is_bot === false && // Botでない
        member.is_restricted === false && // 制限ユーザーでない
        !process.env.SKIP_MEMBERS.split(',').includes(member.id) && // 除外ユーザーでない
        conversationsMembersResult.members.includes(member.id) // 指定されたチャンネルにjoinしている
      )
    })

    // 対象者の履歴を確認するためConversionIDを取得する
    const list = (await app.client.conversations.list({
      token: process.env.SLACK_BOT_TOKEN,
      types: 'im',
      limit: 1000,
    })) as ConversationsListResult
    const conversations = list.channels.map((channel) => ({ userId: channel.user, conversationId: channel.id }))

    // アンケートの集計期間を特定する
    const now = dayjs().locale('ja')
    const firstDayOfMonth = dayjs().locale('ja').date(9).hour(0).minute(0).second(0)

    // ConversionIDを使って、アンケート結果の投稿をサルベージする
    const answeredMembers: Array<string> = []
    for (let conversation of conversations) {
      const history = (await app.client.conversations.history({
        channel: conversation.conversationId,
        token: context.botToken,
        limit: 100,
        oldest: firstDayOfMonth.unix().toString(),
        latest: now.unix().toString(),
      })) as ConversationsHistoryResult

      // 投稿のテキストから回答済みユーザーか判定
      for (let message of history.messages) {
        if (/^.+さんの回答は.+ですね。ご回答ありがとうございました！$/.test(message.text)) {
          const matches = /<@([A-Z0-9]+)> さんの回答は :.+:(.+) ですね/.exec(message.text)
          const member = allMembers.find((member) => member.id === (matches ? matches[1] : ''))
          if (member) {
            answeredMembers.push(member.id)
            break
          }
        }
      }
    }

    // 未回答ユーザーを特定
    const unansweredMembers = members.filter((member) => {
      return !answeredMembers.includes(member.id)
    })

    // 対象ユーザーがいるかチェック
    if (unansweredMembers.length === 0) {
      await say('リマインド対象のユーザーはいませんでした :sparkles:')
      return
    }

    // 対象ユーザーにリマインド
    for (let unansweredMember of unansweredMembers) {
      await app.client.chat.postMessage({
        text: process.env.REMIND_MESSAGE,
        token: context.botToken,
        channel: unansweredMember.id,
      })
    }

    await say(
      [
        `以下のユーザーにリマインドを送信しました`,
        unansweredMembers.map((member) => `<@${member.id}>`).join(', '),
      ].join('\n')
    )
  })
}
