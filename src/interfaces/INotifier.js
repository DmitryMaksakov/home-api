// @flow

// Interface for Notifier (i.e. TelegramBot is notifier)
export interface INotifier {
  init(): void;
  sendBroadcast(message: string): Promise<void>;
}