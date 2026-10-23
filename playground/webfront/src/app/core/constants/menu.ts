import { MenuItem } from '../models/menu.model';

export class Menu {
  public static pages: MenuItem[] = [
    {
      group: 'menu.groups.playground',
      items: [{ icon: 'conversations', label: 'menu.items.conversations', route: '/conversations' }],
    },
  ];
}
