import { WebAPICallResult } from '@slack/web-api'

export interface ConversationsListResult extends WebAPICallResult {
  channels: Array<{
    id: string
    name: string
    user: Object
  }>
}

export interface ConversationsHistoryResult extends WebAPICallResult {
  messages: Array<{
    type: string
    user: string
    text: string
    ts: string
  }>
}

export interface UserResult {
  id: string
  name: string
  deleted: boolean
  profile: {
    real_name_normalized: string
    display_name_normalized: string
  }
  is_bot: boolean
  is_restricted: boolean
}

export interface UsersListResult extends WebAPICallResult {
  members: [UserResult]
}

export interface ConversationsMembersResult extends WebAPICallResult {
  members: Array<string>
}
