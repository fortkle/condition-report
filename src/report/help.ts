import { App, directMention } from '@slack/bolt'
import dayjs from 'dayjs'

export default function (app: App) {
  dayjs.locale('ja')

  /**
   * ヘルプを表示するコマンド
   * @condition-report help
   */
  app.message(directMention(), async ({ message, say }) => {
    if (typeof message.text !== 'string' || !/help/.test(message.text)) return

    // 管理ユーザー以外は終了させる
    if (!process.env.ADMIN_MEMBERS.split(',').includes(message.user)) {
      await say('実行権限がありません')
      return
    }

    const defaultChannel = process.env.DEFAULT_REPORT_CHANNEL
    const skipMembers = process.env.SKIP_MEMBERS.split(',')
      .map((member) => `<@${member}>`)
      .join(', ')
    const remindMessage = process.env.REMIND_MESSAGE

    const text = [
      '*:information_desk_person:「@condition-report」でヘルプが必要ですか？*',
      '以下の4つのコマンドを用意しています！',
      '',
      ':one: ヘルプ表示',
      'ヘルプを表示します。いま表示しているこれがヘルプです！',
      'コマンド実行例:',
      '• `@condition-report help`',
      '',
      ':two: コンディションレポート送信',
      '指定されたチャンネルの参加者に当月のコンディションレポートを送信します。',
      `チャンネル指定がない場合は<#${defaultChannel}>が使われる設定になっています。`,
      'Botユーザー、Restrictedユーザー以外に、以下のユーザーには送信されない設定になっています。',
      `→ ${skipMembers}`,
      'コマンド実行例:',
      `• \`@condition-report hey\` （この場合、デフォルトチャンネルの参加者に送付されます）`,
      '• `@condition-report hey #tmp-conrepo-202004` （#tmp-conrepo-202004の参加者に送付されます）',
      '',
      ':three: リマインド送信',
      'コンディションレポートの未回答者にリマインドを送信します。',
      '実行された月のリマインドのみ可能です。(ex. 4月にリマインド実行した場合は4月に未回答の人に送信されます)',
      'リマインドの文言は以下のように設定されています。',
      `→ 「 ${remindMessage} 」`,
      'コマンド実行例:',
      `• \`@condition-report heyhey\` (この場合、デフォルトチャンネルの参加者のうち未回答の人に送信されます`,
      '• `@condition-report heyhey #tmp-conrepo-202004` （この場合、#tmp-conrepo-20204の参加者のうち未回答の人に送信されます）',
      '',
      ':four: レポート結果集計',
      '回答結果をエクセルファイルで出力します。',
      'コマンド実行例:',
      '• `@condition-report log` （当月分の結果を出力します。 ex. 4月15日に実行した場合、4月分の回答データが集計されます）',
      '• `@condition-report log 2020/03/01-2020/03/31` （指定された期間の結果を出力します。 ex. この場合は3月分の回答データが集計されます）',
    ].join('\n')

    await say(text)
  })
}
