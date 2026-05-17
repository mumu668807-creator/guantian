import type { AIInterpretationOutput } from '../interpretation/interpretationTypes'

export interface AIProvider {
  interpret(prompt: string): Promise<AIInterpretationOutput>
}
