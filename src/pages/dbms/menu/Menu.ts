
export interface MenuType {
  no?: number;
  fkno?: number | null;
  dept?: number;
  ord?: number;
  title?: string;
  purl?: string;
  tname?: string;
  mname?: string;
  useYn?: 'Y' | 'N';
};


export interface ParentMenuType {
  no: number;
  dept: number;
  title: string;
};