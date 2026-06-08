export interface Project {
  id: string
  name: string
  description?: string
  createdAt: number
  updatedAt: number
  isTemplate?: boolean
  templateData?: TemplateData
}

export interface TemplateData {
  sections: any[]
  boardColumns: any[]
  tags: any[]
  tasks?: any[]
}

export interface ProjectTemplate {
  id: string
  name: string
  description: string
  data: TemplateData
  createdAt: number
}
