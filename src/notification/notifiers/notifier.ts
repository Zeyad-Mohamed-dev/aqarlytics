export abstract class Notifier {
  abstract notify(to: string, message: string): Promise<void>;
}