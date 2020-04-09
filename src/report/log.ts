import { App, directMention } from '@slack/bolt'
import { ConversationsListResult, ConversationsHistoryResult, UsersListResult } from './slack_interface'
import * as xlsx from 'xlsx'
import * as fs from 'fs'
import dayjs from 'dayjs'

export default function (app: App) {
  dayjs.locale('ja')

  /**
   * アンケート結果のログを出力するコマンド
   * @condition-report log
   */
  app.message(directMention(), async ({ message, context, say }) => {
    if (typeof message.text !== 'string' || !/log/.test(message.text)) return

    // 管理ユーザー以外は終了させる
    if (!process.env.ADMIN_MEMBERS.split(',').includes(message.user)) {
      await say('実行権限がありません')
      return
    }

    await say('アンケート結果を集計しています。処理が完了するまでもう少々お待ち下さい。')

    // ユーザーの情報を取得する
    const usersListResult = (await app.client.users.list({ token: context.botToken })) as UsersListResult
    const allMembers = usersListResult.members

    // 対象者の履歴を確認するためConversionIDを取得する
    const list = (await app.client.conversations.list({
      token: process.env.SLACK_BOT_TOKEN,
      types: 'im',
      limit: 1000,
    })) as ConversationsListResult
    const conversations = list.channels.map((channel) => ({ userId: channel.user, conversationId: channel.id }))

    // アンケートの集計期間を特定する
    const now = dayjs().locale('ja').date(1).hour(0).minute(0).second(0)
    // デフォルトでは当月指定
    let before = now.add(1, 'month').date(1)
    let after = now.subtract(1, 'month')
    const matches = /log ([0-9]{4}\/[0-9]{2}\/[0-9]{2})-([0-9]{4}\/[0-9]{2}\/[0-9]{2})/.exec(message.text)
    if (matches) {
      before = dayjs(matches[2])
      after = dayjs(matches[1])
    }

    // ConversionIDを使って、アンケート結果の投稿をサルベージする
    const data = [['回答日付', '回答月', 'アカウント名', '天気', 'フリーコメント']]
    for (let conversation of conversations) {
      const history = (await app.client.conversations.history({
        channel: conversation.conversationId,
        token: context.botToken,
        limit: 100,
        oldest: after.unix().toString(),
        latest: before.unix().toString(),
      })) as ConversationsHistoryResult

      // 投稿を昇順(古い順)にソート
      const messages = history.messages.sort((a, b) => (a.ts < b.ts ? -1 : 1))

      // 投稿のテキストからエクセルに出力するデータを取得する
      const record = { date: '', month: '', name: '', weather: '', comment: '' }
      for (let message of messages) {
        if (/^.+さんの回答は.+ですね。ご回答ありがとうございました！$/.test(message.text)) {
          const matches = /<@([A-Z0-9]+)> さんの回答は :.+:(.+) ですね/.exec(message.text)
          const user = allMembers.find((member) => member.id === (matches ? matches[1] : ''))
          record.date = dayjs(parseFloat(message.ts) * 1000).format('YYYY-MM-DD HH:mm:ss')
          record.month = dayjs(parseFloat(message.ts) * 1000).format('YYYY年MM月')
          record.name = user ? user.name : ''
          record.weather = matches ? matches[2] : ''
          continue
        }

        if (/追加でのご回答ありがとうございました！/.test(message.text)) {
          const matches = /追加でのご回答ありがとうございました！(.+)/.exec(message.text)
          record.comment = matches ? matches[1] : ''
          continue
        }
      }

      if (record.date) {
        data.push([record.date, record.month, record.name, record.weather, record.comment])
      }
    }

    if (data.length === 1) {
      await say('指定された期間に集計対象となる回答がありませんでした')
      return
    }

    // 結果をエクセルファイルに出力する
    const filename = 'コンディションレポート結果_' + before.format('YYYY年MM月')
    const workbook = xlsx.utils.book_new()
    const ws = xlsx.utils.aoa_to_sheet(data)
    xlsx.utils.book_append_sheet(workbook, ws, 'result')
    xlsx.writeFile(workbook, `.dist/${filename}.xlsx`)

    await say('集計が完了しました。ダウンロード完了後、すみやかにSlack上から投稿を削除してください。')

    await app.client.files.upload({
      token: context.botToken,
      channels: message.channel,
      file: fs.createReadStream(`.dist/${filename}.xlsx`),
      filename: `${filename}.xlsx`,
      title: `${filename}.xlsx`,
    })
  })
}
