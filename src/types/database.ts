export type LevelCode = 'A1' | 'A2' | 'B1' | 'B2' | 'C1'

export interface Level {
  id: string
  code: LevelCode
  name: string
  order: number
}

export interface Module {
  id: string
  level_id: string
  title: string
  order: number
}

export interface Lesson {
  id: string
  module_id: string
  title: string
  context: string
  learning_goals: string[]
  grammar_focus: string | null
  vocabulary_tags: string[] | null
  order: number
}

export interface Profile {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  level_cefr: LevelCode | null
  created_at: string
  settings: Record<string, unknown> | null
}

export interface Conversation {
  id: string
  user_id: string
  lesson_id: string
  started_at: string
  ended_at: string | null
  message_count: number
  completed: boolean
}

export type MessageRole = 'teacher' | 'student'

export interface Message {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  correction_data: Record<string, unknown> | null
  created_at: string
}

export type LessonProgressStatus = 'not_started' | 'in_progress' | 'completed'

export interface UserLessonProgress {
  user_id: string
  lesson_id: string
  status: LessonProgressStatus
  completed_at: string | null
  xp_earned: number
}

export interface LevelWithModules extends Level {
  modules: ModuleWithLessons[]
}

export interface ModuleWithLessons extends Module {
  lessons: Lesson[]
}
