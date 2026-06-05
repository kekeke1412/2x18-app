export interface User {
  id: string;
  fullName: string;
  mssv?: string;
  role: 'super_admin' | 'core' | 'member';
  avatar?: string;
  avatarUrl?: string;
  birthDate?: string;
  gender?: string;
  phone?: string;
  email?: string;
  school?: string;
  major?: string;
  class?: string;
  generation?: string;
  hometown?: string;
  ethnicity?: string;
  religion?: string;
  cccd?: string;
  bloodType?: string;
  bankAccount?: string;
  bankName?: string;
  medicalHistory?: string;
  hobbies?: string;
  strengths?: string;
  weaknesses?: string;
  goal?: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  credits: number;
  type?: string;
  excludeCPA?: boolean;
  electiveGroup?: string;
}

export interface Grade {
  cc: number | string;
  gk: number | string;
  ck: number | string;
  status: 'Chưa học' | 'Đang học' | 'Đã học' | 'Được miễn' | 'Đạt' | 'Không học';
  semester?: number | string;
}

export interface Task {
  id: string;
  task: string;
  deadline: string;
  subjectId: string;
  done: boolean;
  assignees: string[];
}

export interface AuditLog {
  id: string;
  time: string;
  action: string;
  target?: string;
  detail?: string;
}

export interface Vocabulary {
  id: string;
  word: string;
  meaning: string;
  example: string;
  audioUrl?: string;
  topic?: string;
}
