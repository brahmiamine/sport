export type Category = 'Musculation' | 'Cardio' | 'HIIT' | 'Mobilité'
export type Muscle = 'Pectoraux' | 'Dos' | 'Épaules' | 'Biceps' | 'Triceps' | 'Quadriceps' | 'Ischio-jambiers' | 'Fessiers' | 'Mollets' | 'Abdominaux' | 'Lombaires' | 'Corps entier'

export interface Exercise {
  id: string
  name: string
  category: Category
  equipment: string
  primary: Muscle[]
  secondary: Muscle[]
  sets: number
  reps: string
  rest: number
  duration?: number
  instructions: string[]
  tip: string
  level: 'Débutant' | 'Intermédiaire'
  icon: string
}

export interface SessionItem {
  exerciseId: string
  sets?: number
  reps?: string
  rest?: number
  duration?: number
}

export interface WorkoutTemplate {
  id: string
  name: string
  color: string
  items: SessionItem[]
}

export interface WorkoutLog {
  id: string
  name: string
  date: string
  duration: number
  completed: number
  total: number
}
