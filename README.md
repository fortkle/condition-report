# condition-report
従業員向けの振り返りアンケートシステム（Slack Bot）

## Installation
brew-cask:
```
$ brew install caskroom/cask/brew-cask
```

ngrok:
```
$ brew cask install ngrok
```

condition-report:
```
$ yarn install
$ cp .env.default .env
```

## Development

1. Publish a public url using ngrok.
    ```
    $ yarn run tunnel
    ```

2. Setting Slack App. ('event-subscriptions' and 'interactive-messages')

3. Launch the application.
    ```
    $ yarn run development
    ```
