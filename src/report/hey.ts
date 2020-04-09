import { App, BlockButtonAction, directMention, ViewOutput } from '@slack/bolt'
import { UsersListResult, ConversationsMembersResult } from './slack_interface'
import dayjs from 'dayjs'

export default function (app: App) {
  dayjs.locale('ja')

  /**
   * 指定されたチャンネルを対象者としてアンケートを送付するコマンド
   * @condition-report hey [channel]
   */
  app.message(directMention(), async ({ message, context, say }) => {
    if (typeof message.text !== 'string' || !/(\shey$|\shey\s.+)/.test(message.text)) return

    // 管理ユーザー以外は終了させる
    if (!process.env.ADMIN_MEMBERS.split(',').includes(message.user)) {
      await say('実行権限がありません')
      return
    }

    // アンケート対象者のリストとなるチャンネルを特定
    let channel = process.env.DEFAULT_REPORT_CHANNEL
    const matches = /hey <#([A-Z0-9]+)\|.*>/.exec(message.text)
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

    // 対象者にアンケートを送信
    members.map(async (member) => {
      // 1st message
      await app.client.chat.postMessage({
        text: '月1コンディションレポート：*\n先月のあなたの働きがいを、お天気で表現してみてください:star2:',
        token: context.botToken,
        channel: member.id,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: [
                '*月1コンディションレポート：*',
                '先月のあなたの働きがいを、お天気で表現してみてください:star2:',
                '```（注）働きがいとは',
                '・自分の仕事に誇りを持ち、取り組めていること',
                '・経営者、管理者を信頼し、必要な時に連携ができていること',
                '・一緒に働いている人たちと連帯感を持てていること```',
              ].join('\n'),
            },
          },
        ],
      })

      // 2nd message
      await app.client.chat.postMessage({
        text: '以下の絵文字の中から最も当てはまるものを1つ選んでください',
        token: context.botToken,
        channel: member.id,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '>*以下の絵文字の中から最も当てはまるものを1つ選んでください*',
            },
          },
          {
            type: 'actions',
            block_id: 'weather_select',
            elements: [
              {
                type: 'button',
                action_id: 'weather_button5',
                text: {
                  type: 'plain_text',
                  emoji: true,
                  text: ':sun_with_face:快晴',
                },
                value: '5',
              },
              {
                type: 'button',
                action_id: 'weather_button4',
                text: {
                  type: 'plain_text',
                  emoji: true,
                  text: ':sun_small_cloud:晴れ',
                },
                value: '4',
              },
              {
                type: 'button',
                action_id: 'weather_button3',
                text: {
                  type: 'plain_text',
                  emoji: true,
                  text: ':cloud:曇り',
                },
                value: '3',
              },
              {
                type: 'button',
                action_id: 'weather_button2',
                text: {
                  type: 'plain_text',
                  emoji: true,
                  text: ':sun_behind_rain_cloud:小雨',
                },
                value: '2',
              },
              {
                type: 'button',
                action_id: 'weather_button1',
                text: {
                  type: 'plain_text',
                  emoji: true,
                  text: ':thunder_cloud_and_rain:雨',
                },
                value: '1',
              },
            ],
          },
        ],
      })
    })

    // 管理者に通知
    await say(
      [`以下のユーザーにアンケートを送信しました`, members.map((member) => `<@${member.id}>`).join(', ')].join('\n')
    )
  })

  /**
   * 5段階評価の天気アイコンのボタンを押したときの処理
   */
  app.action(/weather_button([12345])/, async ({ body, context, ack, respond }) => {
    await ack()

    const blockData = body as BlockButtonAction
    await respond(
      `<@${body.user.id}> さんの回答は ${blockData.actions[0].text.text} ですね。ご回答ありがとうございました！`
    )

    const now = dayjs().locale('ja')
    const timeLimit = now.add(5, 'minute').format()

    await app.client.chat.postMessage({
      text: '今月はこれで終了となります。\nもし最後にフリーコメントがあればこちらから回答をお願いします。\n',
      token: context.botToken,
      channel: blockData.user.id,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: [
              '今月はこれで終了となります。',
              'もし最後にフリーコメントがあればこちらから回答をお願いします。',
              '```・回答はいまから5分間だけ可能です',
              '・1回しか送信できません',
              `・間違って送ってしまった場合は、${process.env.ADMIN_DISPLAY_NAME}までDMでお送りください`,
              '```',
            ].join('\n'),
          },
        },
        {
          type: 'actions',
          block_id: 'comment_dialog',
          elements: [
            {
              type: 'button',
              action_id: 'answer_button',
              text: {
                type: 'plain_text',
                emoji: true,
                text: '答える:memo:',
              },
              value: timeLimit,
            },
          ],
        },
      ],
    })

    // バックアップ用チャンネルに投稿
    await app.client.chat.postMessage({
      text: `:point_right: _<@${body.user.id}>から回答がありました_ \n天気: ${blockData.actions[0].text.text}`,
      token: context.botToken,
      channel: process.env.BACKUP_POST_CHANNEL,
    })
  })

  /**
   * 「答える」のボタンを押したときの処理
   */
  app.action('answer_button', async ({ body, context, ack, respond }) => {
    await ack()

    const blockData = body as BlockButtonAction

    // 制限時間を過ぎていた場合は中断する
    const timeLimitString = blockData.actions[0].value
    const timeLimit = dayjs(timeLimitString)
    const now = dayjs().locale('ja')
    if (timeLimit.isBefore(now)) {
      await respond(
        [
          '申し訳ありません。回答期限を過ぎているため受け付けることができませんでした。',
          `気になっていることがあれば、いつでも${process.env.ADMIN_DISPLAY_NAME}までご相談ください！`,
        ].join('\n')
      )
      return
    }

    // 追加コメント用のダイアログを表示する
    await app.client.views.open({
      token: context.botToken,
      trigger_id: blockData.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'additional_comment_view',
        title: {
          type: 'plain_text',
          text: 'フリーコメントに回答する',
        },
        blocks: [
          {
            type: 'input',
            block_id: 'additional_comment_block',
            element: {
              type: 'plain_text_input',
              action_id: 'answer_text',
              multiline: true,
            },
            label: {
              type: 'plain_text',
              text: dayjs(timeLimitString).format('HH時mm分 まで回答できます'),
            },
          },
        ],
        submit: {
          type: 'plain_text',
          text: '送信',
        },
        close: {
          type: 'plain_text',
          text: 'キャンセル',
        },
        private_metadata: JSON.stringify({
          // 制限時間(ボタンを押してから5分間)
          timeLimit: timeLimitString,
          // 「答える」ボタンのタイムスタンプ(回答後にボタンを消すために使う)
          ts: blockData.message ? blockData.message.ts : '',
          // ConversationID(回答後にボタンを消すために使う)
          channelID: blockData.channel ? blockData.channel.id : '',
          // ユーザーのID(バックアップ用チャンネルへの投稿に使う)
          memberID: body.user.id,
        }),
      },
    })
  })

  /**
   * 「答える」でフリーコメントを投稿したときのアクション
   */
  app.view('additional_comment_view', async ({ ack, context, view }) => {
    await ack()

    const viewData = view as ViewOutput
    const metadata = JSON.parse(viewData.private_metadata)

    // 追加コメントを取得
    const additionalComment = viewData.state.values.additional_comment_block.answer_text.value

    // 制限時間を過ぎていた場合は中断する
    const timeLimit = dayjs(metadata.timeLimitString)
    const now = dayjs().locale('ja')
    if (timeLimit.isBefore(now)) {
      await app.client.chat.postMessage({
        text: '申し訳ありません。回答期限を過ぎているため受け付けることができませんでした。',
        token: context.botToken,
        ts: metadata.ts,
        channel: metadata.channelID,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: [
                '申し訳ありません。 *回答期限を過ぎているため受け付けることができませんでした。*',
                `送信が間に合わなかった場合は以下の送信文を${process.env.ADMIN_DISPLAY_NAME}までDMでお送りください。`,
                '```',
                additionalComment,
                '```',
              ].join('\n'),
            },
          },
        ],
      })
      return
    }

    // 回答受付完了を通知
    await app.client.chat.update({
      text: `追加でのご回答ありがとうございました！${additionalComment}`,
      token: context.botToken,
      ts: metadata.ts,
      channel: metadata.channelID,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: [
              '追加でのご回答ありがとうございました！以下の内容で受け付けました。',
              '```',
              additionalComment,
              '```',
            ].join('\n'),
          },
        },
      ],
    })

    // バックアップ用チャンネルに投稿
    await app.client.chat.postMessage({
      text: `:point_right: _<@${metadata.memberID}>から追加の回答がありました_ \n${additionalComment}`,
      token: context.botToken,
      channel: process.env.BACKUP_POST_CHANNEL,
    })
  })
}
