export type MenuIcon = 'conversations';

export interface MenuItem {
  group: string;
  separator?: boolean;
  active?: boolean;
  items: Array<SubMenuItem>;
}

export interface SubMenuItem {
  icon?: MenuIcon;
  label?: string;
  route?: string | null;
  active?: boolean;
  children?: Array<SubMenuItem>;
}
