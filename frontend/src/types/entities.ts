export interface Client {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
