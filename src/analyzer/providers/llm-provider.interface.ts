export interface ILLMProvider {
  complete(prompt: string): Promise<string>;
}

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');